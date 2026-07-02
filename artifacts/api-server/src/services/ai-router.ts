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
import type { GenerateOpts, GenerateResult } from "./intelligence/interface.js";

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
    const { prompt, preferredProvider, opts = {}, noCache, cacheTtlMs, requestType = "generate" } = request;

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
    const chain = providerManager.getFailoverChain(
      preferredProvider ? [] : undefined,
    );

    // Ensure preferred provider is tried first
    if (preferredProvider) {
      const pref = providerManager.get(preferredProvider);
      if (pref?.isConfigured()) chain.unshift(pref);
    }

    const tried: string[] = [];
    let lastError: unknown;

    for (const provider of chain) {
      if (tried.includes(provider.id)) continue;
      tried.push(provider.id);

      const start = Date.now();
      try {
        const result = await provider.generate(prompt, opts);
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

        if (tried.length > 1) this.stats.failovers++;
        return result;

      } catch (err: any) {
        const latencyMs = Date.now() - start;
        lastError = err;
        logger.warn({ provider: provider.id, err: err?.message }, "provider failed, trying next");

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
        }
      }
    }

    // ── All providers exhausted ────────────────────────────────────────────
    this.stats.errors++;
    throw lastError ?? new Error("All AI providers unavailable");
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
