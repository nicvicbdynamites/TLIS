/**
 * Research Adapter — generic wrapper for research services that already
 * follow the google-trends.ts pattern (a `get*Summary(log)` fetcher with its
 * own in-memory cache and `source: "live" | "cached" | "fallback"` field).
 *
 * Delegates entirely to the existing service singletons — never duplicates
 * their caches or fetch logic.
 */

import { logger as rootLogger } from "../../../lib/logger.js";
import type { Log } from "../../gemini.js";
import type { IIntegration, IIntegrationTestResult, IntegrationCategory } from "../types.js";

export interface ResearchAdapterConfig<T> {
  id:            string;
  name:          string;
  priority:      number;
  isConfigured:  () => boolean;
  fetchSummary:  (log: Log) => Promise<T>;
  deriveStatus:  (result: T) => { success: boolean; message?: string };
}

export class ResearchAdapter<T> implements IIntegration {
  readonly category: IntegrationCategory = "research";
  readonly capabilities = ["fetch_summary"];
  readonly schedulerEnabled = true;
  readonly costTrackingEnabled = false;
  readonly streamingSupported = false;

  constructor(private readonly cfg: ResearchAdapterConfig<T>) {}

  get id(): string { return this.cfg.id; }
  get name(): string { return this.cfg.name; }
  get priority(): number { return this.cfg.priority; }

  isConfigured(): boolean {
    return this.cfg.isConfigured();
  }

  async testConnection(): Promise<IIntegrationTestResult> {
    const start = Date.now();
    try {
      const result = await this.cfg.fetchSummary(rootLogger);
      const { success, message } = this.cfg.deriveStatus(result);
      return {
        success,
        latencyMs: Date.now() - start,
        message,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success:   false,
        error:     String(err?.message ?? err),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async healthCheck(): Promise<IIntegrationTestResult> {
    return this.testConnection();
  }
}
