/**
 * Provider Manager — singleton registry for all AI providers.
 *
 * Responsibilities:
 *  - Register / retrieve providers by id
 *  - Maintain priority-ordered failover chain
 *  - Periodic health checks (every 10 min)
 *  - Rate-limit tracking with cool-down
 *  - Aggregate status for /api/intelligence/status
 *
 * Usage:
 *   import { providerManager } from "./provider-manager.js";
 *   const provider = providerManager.getBest();          // highest-priority live provider
 *   const chain    = providerManager.getFailoverChain(); // ordered available providers
 *   const report   = await providerManager.runHealthChecks();
 */

import { logger } from "../lib/logger.js";
import {
  geminiProvider,
  openAIProvider,
  claudeProvider,
  deepSeekProvider,
  grokProvider,
  mistralProvider,
} from "./intelligence/index.js";
import type { IProvider, ProviderInfo, HealthResult } from "./intelligence/interface.js";
import { notificationService } from "./notification-service.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface HealthReport {
  provider:  string;
  result:    HealthResult;
  checkedAt: string;
}

// ── Manager ────────────────────────────────────────────────────────────────

class ProviderManager {
  private readonly registry = new Map<string, IProvider>();
  private readonly rateLimitUntil = new Map<string, number>(); // ts until cool-down ends
  private lastHealthRun?: string;

  constructor() {
    // Register all providers in priority order
    [geminiProvider, openAIProvider, claudeProvider, deepSeekProvider, grokProvider, mistralProvider]
      .forEach(p => this.register(p));

    // Warm-up: run a first health check after 5 s (non-blocking) so the
    // dashboard has data before the scheduler's first "ai-health" run.
    // Recurring checks are driven solely by that scheduler task (every 10m) —
    // do NOT add a second setInterval here, it would run health checks twice.
    setTimeout(() => this.runHealthChecks().catch(() => {}), 5_000);
  }

  register(provider: IProvider): void {
    this.registry.set(provider.id, provider);
    logger.info({ provider: provider.id, priority: provider.priority }, "provider registered");
  }

  get(id: string): IProvider | undefined {
    return this.registry.get(id);
  }

  getAll(): IProvider[] {
    return [...this.registry.values()].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns the highest-priority provider that is configured and not rate-limited.
   * Falls back gracefully — never throws.
   */
  getBest(preferredId?: string): IProvider {
    const now = Date.now();

    if (preferredId) {
      const preferred = this.registry.get(preferredId);
      if (preferred?.isConfigured() && (this.rateLimitUntil.get(preferredId) ?? 0) <= now) {
        return preferred;
      }
    }

    for (const p of this.getAll()) {
      if (p.isConfigured() && (this.rateLimitUntil.get(p.id) ?? 0) <= now) return p;
    }

    // Absolute last resort — return Gemini even if rate-limited
    return geminiProvider;
  }

  /**
   * Ordered list of available providers for sequential failover.
   */
  getFailoverChain(exclude?: string[]): IProvider[] {
    const now = Date.now();
    return this.getAll().filter(p =>
      p.isConfigured() &&
      (this.rateLimitUntil.get(p.id) ?? 0) <= now &&
      !exclude?.includes(p.id),
    );
  }

  markRateLimited(id: string, coolDownMs = 60_000): void {
    this.rateLimitUntil.set(id, Date.now() + coolDownMs);
    logger.warn({ provider: id, coolDownMs }, "provider rate-limited");
    notificationService.push("api_down", "Provider Rate-Limited",
      `${id} is rate-limited — routing to next provider`, { severity: "warning", provider: id });
  }

  markDown(id: string): void {
    logger.warn({ provider: id }, "provider marked down");
    notificationService.push("api_down", "Provider Offline",
      `${id} is unreachable`, { severity: "error", provider: id });
  }

  markUp(id: string): void {
    logger.info({ provider: id }, "provider recovered");
    notificationService.push("api_up", "Provider Online",
      `${id} is back online`, { severity: "success", provider: id });
  }

  async runHealthChecks(): Promise<HealthReport[]> {
    const reports: HealthReport[] = [];
    const previousStatuses = new Map<string, string>(
      [...this.registry.values()].map(p => [p.id, p.status()]),
    );

    await Promise.allSettled(
      [...this.registry.values()].map(async p => {
        const result    = await p.health();
        const checkedAt = new Date().toISOString();
        reports.push({ provider: p.id, result, checkedAt });

        const prev = previousStatuses.get(p.id);
        if (prev !== "connected" && result.status === "connected") this.markUp(p.id);
        if (prev === "connected" && result.status !== "connected" && result.status !== "unconfigured") {
          this.markDown(p.id);
        }
        if (result.status === "rate_limited") this.markRateLimited(p.id);
      }),
    );

    this.lastHealthRun = new Date().toISOString();
    logger.info({ reports: reports.map(r => ({ provider: r.provider, status: r.result.status })) },
      "health checks complete");
    return reports;
  }

  getStatusSummary(): {
    providers: ProviderInfo[];
    lastHealthRun?: string;
    configuredCount: number;
    connectedCount: number;
  } {
    const providers = this.getAll().map(p => p.getInfo());
    return {
      providers,
      lastHealthRun: this.lastHealthRun,
      configuredCount: providers.filter(p => p.configured).length,
      connectedCount:  providers.filter(p => p.status === "connected").length,
    };
  }
}

export const providerManager = new ProviderManager();
