/**
 * Gemini Provider — wraps the existing gemini.ts service for the Phase 2
 * Intelligence Service Layer. Priority 1 (highest).
 */

import {
  testConnection,
  generateText,
  generateResearch,
  errorMessage,
} from "../gemini.js";
import { logger as rootLogger } from "../../lib/logger.js";
import type {
  ProviderStatus, ProviderInfo, HealthResult,
  GenerateOpts, GenerateResult, AnalyzeResult, StreamChunk,
} from "./interface.js";
import { BaseAiProvider } from "./base-provider.js";

export class GeminiProvider extends BaseAiProvider {
  readonly id          = "gemini";
  readonly name        = "Google Gemini";
  readonly description = "Google's Gemini family (3.5 Flash → 3.1 Flash Lite cascade)";
  readonly models      = ["gemini-3.5-flash", "gemini-3.1-flash-lite"] as const;
  readonly priority    = 1;

  private _status: ProviderStatus = "initializing";
  private _lastHealth?: HealthResult;

  isConfigured(): boolean {
    return Boolean(process.env["GEMINI_API_KEY"]?.trim());
  }

  async connect(): Promise<void> {
    if (!this.isConfigured()) { this._status = "unconfigured"; return; }
    this._status = "initializing";
    const h = await this.health();
    this._status = h.status;
  }

  async disconnect(): Promise<void> {
    this._status = "disconnected";
  }

  async health(): Promise<HealthResult> {
    if (!this.isConfigured()) {
      const h: HealthResult = { status: "unconfigured", timestamp: new Date().toISOString() };
      this._lastHealth = h;
      this._status = "unconfigured";
      return h;
    }
    try {
      const result = await testConnection(rootLogger);
      const h: HealthResult = {
        status:    result.status === "Healthy" ? "connected" : result.status === "Unconfigured" ? "unconfigured" : "error",
        latencyMs: result.latencyMs,
        model:     result.model,
        timestamp: result.timestamp,
        error:     result.error,
      };
      this._lastHealth = h;
      this._status = h.status;
      return h;
    } catch (err: any) {
      const h: HealthResult = {
        status: "error",
        error: String(err?.message ?? err),
        timestamp: new Date().toISOString(),
      };
      this._lastHealth = h;
      this._status = "error";
      return h;
    }
  }

  async generate(prompt: string, opts?: GenerateOpts): Promise<GenerateResult> {
    if (!this.isConfigured()) throw new Error("GEMINI_API_KEY not configured");
    const start = Date.now();
    const sysPrompt = opts?.systemPrompt ?? "You are TLIS, a luxury TikTok intelligence system.";
    const fullPrompt = `${sysPrompt}\n\n${prompt}`;
    const result = await generateText(fullPrompt, rootLogger);
    return {
      text:      result.text,
      model:     result.model,
      provider:  this.id,
      latencyMs: Date.now() - start,
    };
  }

  async analyze(content: string, task: string, opts?: GenerateOpts): Promise<AnalyzeResult> {
    if (!this.isConfigured()) throw new Error("GEMINI_API_KEY not configured");
    const start = Date.now();
    const prompt = `${opts?.systemPrompt ?? "You are a luxury TikTok intelligence analyst."}\n\nTask: ${task}\n\nContent:\n${content}\n\nProvide a concise analysis and confidence score (0-100).`;
    const result = await generateResearch(prompt, "Quiet Luxury Lifestyle", rootLogger);
    return {
      analysis:   result.summary,
      confidence: result.confidence,
      provider:   this.id,
      model:      result.model,
      latencyMs:  Date.now() - start,
    };
  }

  async stream(
    prompt: string,
    onChunk: (chunk: StreamChunk) => void,
    opts?: GenerateOpts,
  ): Promise<void> {
    if (!this.isConfigured()) throw new Error("GEMINI_API_KEY not configured");
    const sysPrompt = opts?.systemPrompt ?? "You are TLIS, a luxury TikTok intelligence system.";
    const fullPrompt = `${sysPrompt}\n\n${prompt}`;
    const result = await generateText(fullPrompt, rootLogger);
    onChunk({ text: result.text, done: false, provider: this.id });
    onChunk({ text: "", done: true, provider: this.id });
  }

  status(): ProviderStatus { return this._status; }

  getInfo(): ProviderInfo {
    return {
      id:          this.id,
      name:        this.name,
      description: this.description,
      models:      [...this.models],
      priority:    this.priority,
      status:      this._status,
      configured:  this.isConfigured(),
      lastHealth:  this._lastHealth,
    };
  }

  errorMsg(err: unknown) { return errorMessage(err); }
}

export const geminiProvider = new GeminiProvider();
