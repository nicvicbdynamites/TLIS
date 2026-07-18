/**
 * Stub Adapter — for providers with zero backend implementation yet
 * (SEMrush, TikTok, Instagram, YouTube, Pinterest). Reports status purely
 * from `secretsManager` — never claims a live connection.
 */

import { secretsManager } from "../../secrets-manager.js";
import type { IIntegration, IIntegrationTestResult, IntegrationCategory } from "../types.js";

export interface StubAdapterConfig {
  id:         string;
  name:       string;
  category:   IntegrationCategory;
  priority:   number;
  secretKeys: string[];
}

export class StubAdapter implements IIntegration {
  readonly capabilities: string[] = [];
  readonly schedulerEnabled = false;
  readonly costTrackingEnabled = false;
  readonly streamingSupported = false;

  constructor(private readonly cfg: StubAdapterConfig) {}

  get id(): string { return this.cfg.id; }
  get name(): string { return this.cfg.name; }
  get category(): IntegrationCategory { return this.cfg.category; }
  get priority(): number { return this.cfg.priority; }

  isConfigured(): boolean {
    return this.cfg.secretKeys.every(k => secretsManager.isConfigured(k));
  }

  async testConnection(): Promise<IIntegrationTestResult> {
    const configured = this.isConfigured();
    return {
      success: false,
      message: configured
        ? "Credentials detected — live integration not yet implemented"
        : "Not configured",
      timestamp:      new Date().toISOString(),
      statusOverride: configured ? "stub_not_implemented" : "unconfigured",
    };
  }

  async healthCheck(): Promise<IIntegrationTestResult> {
    return this.testConnection();
  }
}
