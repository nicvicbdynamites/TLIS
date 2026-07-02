/**
 * Metrics Collector — rolling latency/retry stats per integration, backing the
 * registry's `avgResponseTimeMs` / `retryCount` fields and
 * GET /api/integration-core/metrics.
 */

interface MetricState {
  samples:    number[];
  retryCount: number;
}

export interface MetricSnapshot {
  avgLatencyMs?: number;
  retryCount:    number;
  sampleCount:   number;
}

class MetricsCollector {
  private readonly state = new Map<string, MetricState>();
  private readonly maxSamples = 20;

  private ensure(id: string): MetricState {
    let s = this.state.get(id);
    if (!s) {
      s = { samples: [], retryCount: 0 };
      this.state.set(id, s);
    }
    return s;
  }

  recordLatency(id: string, ms: number): void {
    const s = this.ensure(id);
    s.samples.push(ms);
    if (s.samples.length > this.maxSamples) s.samples.shift();
  }

  recordRetry(id: string): void {
    this.ensure(id).retryCount++;
  }

  getAvgLatency(id: string): number | undefined {
    const s = this.state.get(id);
    if (!s || s.samples.length === 0) return undefined;
    return Math.round(s.samples.reduce((a, b) => a + b, 0) / s.samples.length);
  }

  getRetryCount(id: string): number {
    return this.state.get(id)?.retryCount ?? 0;
  }

  getSnapshot(id: string): MetricSnapshot {
    const s = this.state.get(id);
    return {
      avgLatencyMs: this.getAvgLatency(id),
      retryCount:   s?.retryCount ?? 0,
      sampleCount:  s?.samples.length ?? 0,
    };
  }

  getAllSnapshots(): Record<string, MetricSnapshot> {
    const out: Record<string, MetricSnapshot> = {};
    for (const id of this.state.keys()) out[id] = this.getSnapshot(id);
    return out;
  }
}

export const metricsCollector = new MetricsCollector();
