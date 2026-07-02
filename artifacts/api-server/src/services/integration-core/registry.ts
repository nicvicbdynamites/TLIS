/**
 * Integration Registry — the single source of truth for
 * GET /api/integration-core/registry.
 *
 * Holds one lightweight `IntegrationRegistryEntry` snapshot per registered
 * `IIntegration` adapter. It never owns provider state — adapters delegate
 * to the real singletons (providerManager, google-trends.ts, etc.) and the
 * registry just records the last observed result.
 */

import { logger } from "../../lib/logger.js";
import { integrationEventBus } from "./event-bus.js";
import { integrationActivityLogger } from "./activity-logger.js";
import { metricsCollector } from "./metrics-collector.js";
import type {
  IIntegration, IIntegrationTestResult,
  IntegrationCategory, IntegrationRegistryEntry,
} from "./types.js";

interface RegistryRecord {
  adapter: IIntegration;
  entry:   IntegrationRegistryEntry;
}

class IntegrationRegistry {
  private readonly records = new Map<string, RegistryRecord>();

  register(adapter: IIntegration): void {
    const initialStatus = adapter.isConfigured() ? "initializing" : "unconfigured";
    const entry: IntegrationRegistryEntry = {
      id:                  adapter.id,
      name:                adapter.name,
      category:            adapter.category,
      status:              initialStatus,
      connectionState:     initialStatus,
      apiVersion:          adapter.getApiVersion?.(),
      retryCount:          0,
      rateLimitStatus:     { limited: false },
      schedulerEnabled:    adapter.schedulerEnabled,
      priority:            adapter.priority,
      costTrackingEnabled: adapter.costTrackingEnabled,
      streamingSupported:  adapter.streamingSupported,
    };
    this.records.set(adapter.id, { adapter, entry });
    integrationEventBus.emit({
      type: "integration.registered", integrationId: adapter.id, timestamp: new Date().toISOString(),
    });
    logger.info({ integration: adapter.id, category: adapter.category }, "integration-core: adapter registered");
  }

  getEntry(id: string): IntegrationRegistryEntry | undefined {
    const rec = this.records.get(id);
    return rec ? { ...rec.entry } : undefined;
  }

  getAll(): IntegrationRegistryEntry[] {
    return [...this.records.values()]
      .map(r => ({ ...r.entry }))
      .sort((a, b) => a.priority - b.priority);
  }

  getByCategory(category: IntegrationCategory): IntegrationRegistryEntry[] {
    return this.getAll().filter(e => e.category === category);
  }

  private applyResult(id: string, result: IIntegrationTestResult): void {
    const rec = this.records.get(id);
    if (!rec) return;

    const prevStatus = rec.entry.status;
    const nowIso      = new Date().toISOString();
    rec.entry.lastHealthCheckAt = nowIso;

    if (result.statusOverride) {
      rec.entry.status = result.statusOverride;
    } else if (result.success) {
      rec.entry.status = "connected";
    } else {
      rec.entry.status = rec.adapter.isConfigured() ? "error" : "unconfigured";
    }
    rec.entry.connectionState = rec.entry.status;
    rec.entry.rateLimitStatus = { limited: rec.entry.status === "rate_limited" };

    if (result.success) rec.entry.lastSuccessAt = nowIso;
    else                 rec.entry.lastFailureAt = nowIso;

    if (result.latencyMs !== undefined) {
      metricsCollector.recordLatency(id, result.latencyMs);
      rec.entry.avgResponseTimeMs = metricsCollector.getAvgLatency(id);
    }
    rec.entry.retryCount = metricsCollector.getRetryCount(id);

    integrationActivityLogger.record({
      integrationId: id,
      category:      rec.entry.category,
      action:        "health_check",
      status:        result.success ? "success" : (rec.entry.status === "unconfigured" ? "warning" : "error"),
      detail:        result.message ?? result.error,
      latencyMs:     result.latencyMs,
    });

    if (prevStatus !== rec.entry.status) {
      integrationEventBus.emit({
        type: "integration.status_changed", integrationId: id, timestamp: nowIso,
        payload: { from: prevStatus, to: rec.entry.status },
      });
    }
  }

  async runHealthCheck(id: string): Promise<IIntegrationTestResult | undefined> {
    const rec = this.records.get(id);
    if (!rec) return undefined;
    const result = await rec.adapter.healthCheck();
    this.applyResult(id, result);
    return result;
  }

  async runTest(id: string): Promise<IIntegrationTestResult> {
    const rec = this.records.get(id);
    if (!rec) throw new Error(`Integration '${id}' not found`);
    const result = await rec.adapter.testConnection();
    this.applyResult(id, result);
    return result;
  }

  /** Refresh only the given categories (used by the AI registry-sync task). */
  async refreshCategory(category: IntegrationCategory | IntegrationCategory[]): Promise<void> {
    const categories = Array.isArray(category) ? category : [category];
    const ids = [...this.records.values()]
      .filter(r => categories.includes(r.entry.category))
      .map(r => r.adapter.id);
    await Promise.allSettled(ids.map(id => this.runHealthCheck(id)));
  }

  /** Refresh every category except the given ones (used by the 5m provider-health sweep). */
  async refreshAllExcept(excludeCategories: IntegrationCategory[]): Promise<void> {
    const ids = [...this.records.values()]
      .filter(r => !excludeCategories.includes(r.entry.category))
      .map(r => r.adapter.id);
    await Promise.allSettled(ids.map(id => this.runHealthCheck(id)));
  }

  getSummary(): {
    total: number; connected: number; configured: number;
    byCategory: Record<IntegrationCategory, number>;
  } {
    const all = this.getAll();
    return {
      total:     all.length,
      connected: all.filter(e => e.status === "connected").length,
      configured: all.filter(e => e.status !== "unconfigured").length,
      byCategory: {
        ai:       all.filter(e => e.category === "ai").length,
        research: all.filter(e => e.category === "research").length,
        social:   all.filter(e => e.category === "social").length,
      },
    };
  }
}

export const integrationRegistry = new IntegrationRegistry();
