/**
 * BaseAiProvider — Phase 4A shared foundation for every IProvider.
 *
 * Existing provider classes (Gemini, OpenAI, Claude, DeepSeek, Grok, Mistral)
 * keep their hand-written connect/health/generate/analyze/stream/status/getInfo
 * bodies unchanged — those become concrete overrides of the abstract members
 * declared here. This class only supplies the *new* Phase 4A surface
 * (initialize/healthCheck/generateText/generateStructuredOutput/generateImage/
 * listModels/estimateCost/usageStatistics) as sensible defaults built on top
 * of the existing methods, so no provider file needs to duplicate this logic.
 */

import type {
  IProvider, ProviderStatus, ProviderInfo, HealthResult,
  GenerateOpts, GenerateResult, AnalyzeResult, StreamChunk,
  StructuredOutputOpts, StructuredOutputResult,
  ImageGenOpts, ImageGenResult,
  ModelInfo, CostEstimate, UsageStats,
} from "./interface.js";
import { resolvePricing } from "./pricing.js";
import { intelligenceLogger } from "../intelligence-logger.js";

export abstract class BaseAiProvider implements IProvider {
  abstract readonly id:          string;
  abstract readonly name:        string;
  abstract readonly description: string;
  abstract readonly models:      readonly string[];
  abstract readonly priority:    number;

  abstract isConfigured(): boolean;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract health(): Promise<HealthResult>;
  abstract generate(prompt: string, opts?: GenerateOpts): Promise<GenerateResult>;
  abstract analyze(content: string, task: string, opts?: GenerateOpts): Promise<AnalyzeResult>;
  abstract stream(
    prompt: string,
    onChunk: (chunk: StreamChunk) => void,
    opts?: GenerateOpts,
  ): Promise<void>;
  abstract status(): ProviderStatus;
  abstract getInfo(): ProviderInfo;

  // ── Phase 4A defaults ──────────────────────────────────────────────────

  async initialize(): Promise<void> {
    return this.connect();
  }

  async healthCheck(): Promise<HealthResult> {
    return this.health();
  }

  async generateText(prompt: string, opts?: GenerateOpts): Promise<GenerateResult> {
    return this.generate(prompt, opts);
  }

  async generateStructuredOutput<T = unknown>(
    prompt: string,
    opts?: StructuredOutputOpts,
  ): Promise<StructuredOutputResult<T>> {
    if (!this.isConfigured()) throw new Error(`${this.id}: not configured`);
    const start = Date.now();
    const instruction = opts?.schemaDescription
      ? `Respond ONLY with valid JSON matching this shape (no markdown fences, no commentary): ${opts.schemaDescription}`
      : `Respond ONLY with valid JSON (no markdown fences, no commentary).`;
    const systemPrompt = [opts?.systemPrompt, instruction].filter(Boolean).join("\n\n");

    const result = await this.generate(prompt, { ...opts, systemPrompt });
    const cleaned = result.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    let data: T;
    try {
      data = JSON.parse(cleaned) as T;
    } catch (err: any) {
      throw new Error(`${this.id}: structured output was not valid JSON — ${String(err?.message ?? err)}`);
    }

    return {
      data,
      raw:       result.text,
      provider:  this.id,
      model:     result.model,
      latencyMs: Date.now() - start,
    };
  }

  async generateImage(_prompt: string, _opts?: ImageGenOpts): Promise<ImageGenResult> {
    throw new Error(`${this.id}: image generation is not supported by this provider`);
  }

  listModels(): ModelInfo[] {
    return this.models.map(id => ({ id }));
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): CostEstimate {
    const pricing = resolvePricing(this.id, model);
    const estimatedCostUsd = pricing
      ? Math.round(
          ((inputTokens / 1000) * pricing.inputPer1k + (outputTokens / 1000) * pricing.outputPer1k) * 1_000_000,
        ) / 1_000_000
      : 0;
    return { provider: this.id, model, inputTokens, outputTokens, estimatedCostUsd };
  }

  usageStatistics(): UsageStats {
    return intelligenceLogger.getProviderStats(this.id);
  }
}
