/**
 * AI Router — intelligent request routing across all AI providers.
 *
 * Responsibilities:
 *  - Select the best available provider (respects priority & failover)
 *  - TTL-based in-memory cache for identical prompts (5 min default)
 *  - Automatic retry with failover on rate-limit / error
 *  - Log every request to intelligenceLogger
 *  - Track token usage and estimated cost
 *
 * Usage:
 *   const result = await aiRouter.generate(prompt);
 *   const result = await aiRouter.generate(prompt, { preferredProvider: "openai" });
 *   const stats  = aiRouter.getStats();
 */

import { logger } from "../lib/logger.js";
import { providerManager } from "./provider-manager.js";
import { intelligenceLogger } from "./intelligence-logger.js";
import type { GenerateOpts, GenerateResult, IProvider } from "./intelligence/interface.js";

// ── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry {
  result:    GenerateResult;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

function cacheKey(prompt: string, preferredProvider?: string): string {
  const normalized = prompt.slice(0, 300).toLowerCase().replace(/\s+/g, " ").trim();
  return `${preferredProvider ?? "auto"}::${normalized}`;
}

// ── Router Stats ───────────────────────────────────────────────────────────

export interface RouterStats {
  totalRequests:    number;
  cacheHits:        number;
  cacheSize:        number;
  failovers:        number;
  errors:           number;
  avgLatencyMs:     number;
  providerUsage:    Record<string, number>;
}

// ── Router ─────────────────────────────────────────────────────────────────

/** Ordering strategy for the failover chain (Phase 4A). Defaults to "priority" — fully backward compatible. */
export type RouteStrategy = "priority" | "cost" | "health";

export interface RouteRequest {
  prompt:            string;
  preferredProvider?: string;
  opts?:             GenerateOpts;
  /** Skip cache for this request */
  noCache?:          boolean;
  /** Custom cache TTL in ms */
  cacheTtlMs?:       number;
  /** Request type label for logging */
  requestType?:      string;
  /** Abort a single provider attempt after this many ms and fail over (Phase 4A). Default: no timeout. */
  timeoutMs?:        number;
  /** Retries per provider before moving to the next one in the chain (Phase 4A). Default: 1 (no retry). */
  retries?:          number;
  /** Reorder the failover chain by priority (default), estimated cost, or recent health/latency (Phase 4A). */
  strategy?:         RouteStrategy;
}

class AIRouter {
  private readonly cache = new Map<string, CacheEntry>();
  private stats: RouterStats = {
    totalRequests: 0, cacheHits: 0, cacheSize: 0,
    failovers: 0, errors: 0, avgLatencyMs: 0, providerUsage: {},
  };

  async generate(
    prompt: string,
    opts?: Omit<RouteRequest, "prompt">,
  ): Promise<GenerateResult> {
    const request: RouteRequest = { prompt, ...opts };
    return this.route(request);
  }

  async route(request: RouteRequest): Promise<GenerateResult> {
    const {
      prompt, preferredProvider, opts = {}, noCache, cacheTtlMs, requestType = "generate",
      timeoutMs, retries = 1, strategy = "priority",
    } = request;

    this.stats.totalRequests++;

    // ── Cache check ────────────────────────────────────────────────────────
    if (!noCache) {
      const key   = cacheKey(prompt, preferredProvider);
      const entry = this.cache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        this.stats.cacheHits++;
        intelligenceLogger.record({
          provider: entry.result.provider,
          requestType,
          prompt,
          latencyMs: 0,
          status: "cached",
          model: entry.result.model,
        });
        return { ...entry.result, cached: true };
      }
    }

    // ── Provider failover chain ────────────────────────────────────────────
    let chain = providerManager.getFailoverChain(
      preferredProvider ? [] : undefined,
    );
    chain = this.reorderChain(chain, strategy);

    // Ensure preferred provider is tried first
    if (preferredProvider) {
      const pref = providerManager.get(preferredProvider);
      if (pref?.isConfigured()) chain.unshift(pref);
    }

    const attemptsPerProvider = Math.max(1, retries);
    const tried: string[] = [];
    let lastError: unknown;

    for (const provider of chain) {
      if (tried.includes(provider.id)) continue;
      tried.push(provider.id);

      for (let attempt = 1; attempt <= attemptsPerProvider; attempt++) {
        const start = Date.now();
        try {
          const result = await this.withTimeout(provider.generate(prompt, opts), timeoutMs, provider.id);
          const latencyMs = Date.now() - start;

          // ── Log success ────────────────────────────────────────────────────
          intelligenceLogger.record({
            provider: provider.id,
            requestType,
            prompt,
            latencyMs,
            status: "success",
            model:        result.model,
            inputTokens:  result.inputTokens,
            outputTokens: result.outputTokens,
          });

          // ── Update stats ───────────────────────────────────────────────────
          this.stats.providerUsage[provider.id] = (this.stats.providerUsage[provider.id] ?? 0) + 1;
          this.updateAvgLatency(latencyMs);

          // ── Cache result ───────────────────────────────────────────────────
          if (!noCache) {
            const key = cacheKey(prompt, preferredProvider);
            this.cache.set(key, {
              result,
              expiresAt: Date.now() + (cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
            });
            this.pruneCache();
          }

          if (tried.length > 1 || attempt > 1) this.stats.failovers++;
          return result;

        } catch (err: any) {
          const latencyMs = Date.now() - start;
          lastError = err;
          const willRetrySameProvider = attempt < attemptsPerProvider;
          logger.warn(
            { provider: provider.id, attempt, willRetrySameProvider, err: err?.message },
            willRetrySameProvider ? "provider failed, retrying" : "provider failed, trying next",
          );

          intelligenceLogger.record({
            provider: provider.id,
            requestType,
            prompt,
            latencyMs,
            status: "error",
            error: String(err?.message ?? err),
          });

          if (String(err?.message).includes("rate") || String(err?.message).includes("429")) {
            providerManager.markRateLimited(provider.id);
            break; // rate-limited — skip remaining retries for this provider, move on
          }

          if (willRetrySameProvider) {
            await new Promise(res => setTimeout(res, 250 * attempt));
          }
        }
      }
    }

    // ── All providers exhausted ────────────────────────────────────────────
    this.stats.errors++;
    throw lastError ?? new Error("All AI providers unavailable");
  }

  /**
   * Reorder an already-filtered (configured, not rate-limited) failover chain.
   * "priority" is a no-op — getFailoverChain() already returns priority order.
   */
  private reorderChain(chain: IProvider[], strategy: RouteStrategy): IProvider[] {
    if (strategy === "priority") return chain;

    if (strategy === "cost") {
      return [...chain].sort((a, b) => {
        const costA = a.estimateCost(1000, 500).estimatedCostUsd;
        const costB = b.estimateCost(1000, 500).estimatedCostUsd;
        return costA - costB;
      });
    }

    // "health": prefer connected providers, then lowest recent latency
    return [...chain].sort((a, b) => {
      const infoA = a.getInfo();
      const infoB = b.getInfo();
      const connectedA = infoA.status === "connected" ? 0 : 1;
      const connectedB = infoB.status === "connected" ? 0 : 1;
      if (connectedA !== connectedB) return connectedA - connectedB;
      const latA = infoA.lastHealth?.latencyMs ?? Number.POSITIVE_INFINITY;
      const latB = infoB.lastHealth?.latencyMs ?? Number.POSITIVE_INFINITY;
      return latA - latB;
    });
  }

  /** Wrap a provider call with an optional timeout; rejects (does not hang) past timeoutMs. */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined, providerId: string): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) return promise;
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${providerId} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  getStats(): RouterStats {
    return { ...this.stats, cacheSize: this.cache.size };
  }

  clearCache(): void {
    this.cache.clear();
    logger.info("AI router cache cleared");
  }

  private updateAvgLatency(latencyMs: number): void {
    const n = this.stats.totalRequests - this.stats.cacheHits;
    this.stats.avgLatencyMs = Math.round(
      (this.stats.avgLatencyMs * (n - 1) + latencyMs) / n,
    );
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    // Hard cap at 200 entries
    if (this.cache.size > 200) {
      const oldest = [...this.cache.entries()]
        .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
        .slice(0, this.cache.size - 150);
      for (const [k] of oldest) this.cache.delete(k);
    }
  }
}

export const aiRouter = new AIRouter();
