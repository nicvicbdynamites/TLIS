/**
 * Intelligence Logger — in-memory circular log for all AI provider requests.
 *
 * Logs are stored in a bounded ring buffer (default 500 entries).
 * Exposed via GET /api/intelligence/logs for the Executive Command Center.
 *
 * Usage:
 *   intelligenceLogger.record({ provider, requestType, latencyMs, status });
 *   intelligenceLogger.getRecent(20);
 *   intelligenceLogger.getStats();
 */

import { estimateCostUsd } from "./intelligence/pricing.js";
import type { UsageStats } from "./intelligence/interface.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface IntelligenceLog {
  id:            string;
  timestamp:     string;
  provider:      string;
  requestType:   string;
  prompt?:       string;  // first 120 chars only
  latencyMs:     number;
  status:        "success" | "error" | "timeout" | "cached" | "fallback";
  error?:        string;
  model?:        string;
  inputTokens?:  number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface LogStats {
  total:          number;
  last24hTotal:   number;
  avgLatencyMs:   number;
  successRate:    number;
  byProvider:     Record<string, { count: number; avgLatencyMs: number; errors: number }>;
  estimatedCostUsd: number;
}

// ── Cost estimation ──────────────────────────────────────────────────────
// Delegates to the shared per-model pricing table (Phase 4A Cost Tracking
// Service) instead of the old flat per-provider rate.

function estimateCost(provider: string, tokens?: number, model?: string): number | undefined {
  if (!tokens) return undefined;
  // No input/output split available at log time — treat all tokens as output,
  // which is the more conservative (higher) estimate for most providers.
  const cost = estimateCostUsd(provider, 0, tokens, model);
  return cost || undefined;
}

// ── Logger ─────────────────────────────────────────────────────────────────

class IntelligenceLogger {
  private readonly logs: IntelligenceLog[] = [];
  private readonly maxLogs: number;

  constructor(maxLogs = 500) {
    this.maxLogs = maxLogs;
  }

  record(entry: Omit<IntelligenceLog, "id" | "timestamp" | "estimatedCostUsd">): IntelligenceLog {
    const log: IntelligenceLog = {
      ...entry,
      id:        crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      prompt:    entry.prompt ? entry.prompt.slice(0, 120) : undefined,
      estimatedCostUsd: estimateCost(
        entry.provider,
        (entry.inputTokens ?? 0) + (entry.outputTokens ?? 0),
        entry.model,
      ),
    };
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(this.maxLogs);
    }
    return log;
  }

  getRecent(n = 20): IntelligenceLog[] {
    return this.logs.slice(0, n);
  }

  getStats(): LogStats {
    const now = Date.now();
    const last24h = this.logs.filter(l =>
      now - new Date(l.timestamp).getTime() < 86_400_000,
    );

    const byProvider: LogStats["byProvider"] = {};
    let totalLatency = 0;
    let successCount = 0;
    let totalCost = 0;

    for (const log of this.logs) {
      totalLatency += log.latencyMs;
      if (log.status === "success" || log.status === "cached") successCount++;
      if (log.estimatedCostUsd) totalCost += log.estimatedCostUsd;

      if (!byProvider[log.provider]) {
        byProvider[log.provider] = { count: 0, avgLatencyMs: 0, errors: 0 };
      }
      const p = byProvider[log.provider];
      p.count++;
      p.avgLatencyMs = Math.round(
        (p.avgLatencyMs * (p.count - 1) + log.latencyMs) / p.count,
      );
      if (log.status === "error" || log.status === "timeout") p.errors++;
    }

    return {
      total:          this.logs.length,
      last24hTotal:   last24h.length,
      avgLatencyMs:   this.logs.length ? Math.round(totalLatency / this.logs.length) : 0,
      successRate:    this.logs.length ? Math.round((successCount / this.logs.length) * 100) : 0,
      byProvider,
      estimatedCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000,
    };
  }

  clear(): void {
    this.logs.splice(0);
  }

  /** Aggregate usage/cost/latency stats for a single provider — backs IProvider.usageStatistics() */
  getProviderStats(provider: string): UsageStats {
    const logs = this.logs.filter(l => l.provider === provider);
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let totalLatency = 0;
    let successCount = 0;

    for (const log of logs) {
      totalInputTokens  += log.inputTokens ?? 0;
      totalOutputTokens += log.outputTokens ?? 0;
      totalCostUsd      += log.estimatedCostUsd ?? 0;
      totalLatency      += log.latencyMs;
      if (log.status === "success" || log.status === "cached") successCount++;
    }

    return {
      provider,
      totalRequests:     logs.length,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd:      Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      avgLatencyMs:      logs.length ? Math.round(totalLatency / logs.length) : 0,
      successRate:       logs.length ? Math.round((successCount / logs.length) * 100) : 0,
    };
  }
}

export const intelligenceLogger = new IntelligenceLogger();
