/**
 * AI Adapter — wraps an existing `IProvider` (gemini/openai/claude/deepseek/
 * grok/mistral) so it can register in the Integration Core registry without
 * duplicating providerManager's state.
 */

import type { IProvider } from "../../intelligence/interface.js";
import type { IIntegration, IIntegrationTestResult, IntegrationCategory } from "../types.js";

export class AiAdapter implements IIntegration {
  readonly category: IntegrationCategory = "ai";
  readonly capabilities = ["generate", "analyze", "stream"];
  readonly schedulerEnabled = true;
  readonly costTrackingEnabled = true;
  readonly streamingSupported = true;

  constructor(private readonly provider: IProvider) {}

  get id(): string { return this.provider.id; }
  get name(): string { return this.provider.name; }
  get priority(): number { return this.provider.priority; }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  getApiVersion(): string | undefined {
    return this.provider.models[0];
  }

  /** On-demand live check — used only by the manual "Test Connection" action. */
  async testConnection(): Promise<IIntegrationTestResult> {
    const h = await this.provider.health();
    return {
      success:        h.status === "connected",
      latencyMs:      h.latencyMs,
      message:        h.model,
      error:          h.error,
      timestamp:      h.timestamp,
      statusOverride: h.status,
    };
  }

  /**
   * Cache-only read of the provider's last known health — NEVER triggers a
   * network call. AI health checks are driven solely by the scheduler's
   * `ai-health` task (via providerManager.runHealthChecks); this just mirrors
   * that already-computed state into the Integration Core registry.
   */
  async healthCheck(): Promise<IIntegrationTestResult> {
    const info = this.provider.getInfo();
    const h    = info.lastHealth;
    return {
      success:        info.status === "connected",
      latencyMs:      h?.latencyMs,
      message:        h?.model,
      error:          h?.error,
      timestamp:      h?.timestamp ?? new Date().toISOString(),
      statusOverride: info.status,
    };
  }
}
