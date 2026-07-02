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

// ── Cost estimation (very rough) ──────────────────────────────────────────

const COST_PER_1K_TOKENS: Record<string, number> = {
  "gemini":   0.00015,
  "openai":   0.00060,
  "claude":   0.00300,
  "deepseek": 0.00014,
  "grok":     0.00200,
  "mistral":  0.00020,
};

function estimateCost(provider: string, tokens?: number): number | undefined {
  if (!tokens) return undefined;
  const rate = COST_PER_1K_TOKENS[provider];
  if (!rate) return undefined;
  return Math.round(((tokens / 1000) * rate) * 1_000_000) / 1_000_000;
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
}

export const intelligenceLogger = new IntelligenceLogger();
