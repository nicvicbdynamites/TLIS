/**
 * OpenRouter Provider — unified gateway to many hosted models via a single
 * OpenAI-compatible API (openrouter.ai). Priority 7 (last-resort catch-all).
 *
 * Unlike the other providers, OpenRouter's whole value is model choice, so
 * `GenerateOpts.model` is the primary way callers pick a specific model —
 * defaults to a solid free-tier-friendly model when omitted.
 */

import type {
  ProviderStatus, ProviderInfo, HealthResult,
  GenerateOpts, GenerateResult, AnalyzeResult, StreamChunk, ModelInfo,
} from "./interface.js";
import { BaseAiProvider } from "./base-provider.js";

const BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

export class OpenRouterProvider extends BaseAiProvider {
  readonly id          = "openrouter";
  readonly name        = "OpenRouter";
  readonly description = "Unified gateway to many hosted models (Llama, Qwen, Gemma, and more)";
  readonly models      = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "qwen/qwen-2.5-7b-instruct:free",
  ] as const;
  readonly priority    = 7;

  private _status: ProviderStatus = "initializing";
  private _lastHealth?: HealthResult;

  private get apiKey(): string | undefined {
    return process.env["OPENROUTER_API_KEY"]?.trim() || undefined;
  }

  private headers() {
    return {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${this.apiKey}`,
      "HTTP-Referer":  "https://replit.com",
      "X-Title":       "TLIS — TikTok Luxury Intelligence System",
    };
  }

  isConfigured(): boolean { return Boolean(this.apiKey); }
  async connect(): Promise<void> { const h = await this.health(); this._status = h.status; }
  async disconnect(): Promise<void> { this._status = "disconnected"; }

  async health(): Promise<HealthResult> {
    if (!this.isConfigured()) {
      const h: HealthResult = { status: "unconfigured", timestamp: new Date().toISOString() };
      this._lastHealth = h; this._status = "unconfigured"; return h;
    }
    const start = Date.now();
    try {
      const resp = await fetch(`${BASE_URL}/models`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(6000),
      });
      const h: HealthResult = {
        status:    resp.ok ? "connected" : resp.status === 429 ? "rate_limited" : "error",
        latencyMs: Date.now() - start,
        model:     DEFAULT_MODEL,
        error:     resp.ok ? undefined : `HTTP ${resp.status}`,
        timestamp: new Date().toISOString(),
      };
      this._lastHealth = h; this._status = h.status; return h;
    } catch (err: any) {
      const h: HealthResult = {
        status: "error", error: String(err?.message ?? err),
        latencyMs: Date.now() - start, timestamp: new Date().toISOString(),
      };
      this._lastHealth = h; this._status = "error"; return h;
    }
  }

  async generate(prompt: string, opts?: GenerateOpts): Promise<GenerateResult> {
    if (!this.isConfigured()) throw new Error("OPENROUTER_API_KEY not configured");
    const start = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (opts?.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: prompt });

    const resp = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts?.model ?? DEFAULT_MODEL,
        messages,
        max_tokens:  opts?.maxTokens  ?? 1024,
        temperature: opts?.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) { const t = await resp.text().catch(() => ""); throw new Error(`OpenRouter ${resp.status}: ${t.slice(0, 120)}`); }
    const data = await resp.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: data.choices[0]?.message.content ?? "",
      model: data.model ?? opts?.model ?? DEFAULT_MODEL,
      provider: this.id,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      latencyMs: Date.now() - start,
    };
  }

  async analyze(content: string, task: string, opts?: GenerateOpts): Promise<AnalyzeResult> {
    const start = Date.now();
    const result = await this.generate(`Task: ${task}\n\n${content}`, { ...opts, maxTokens: 512 });
    return { analysis: result.text, confidence: 74, provider: this.id, model: result.model, latencyMs: Date.now() - start };
  }

  async stream(prompt: string, onChunk: (c: StreamChunk) => void, opts?: GenerateOpts): Promise<void> {
    const result = await this.generate(prompt, opts);
    onChunk({ text: result.text, done: false, provider: this.id });
    onChunk({ text: "", done: true, provider: this.id });
  }

  status(): ProviderStatus { return this._status; }
  getInfo(): ProviderInfo {
    return {
      id: this.id, name: this.name, description: this.description,
      models: [...this.models], priority: this.priority,
      status: this._status, configured: this.isConfigured(), lastHealth: this._lastHealth,
    };
  }

  override listModels(): ModelInfo[] {
    return this.models.map(id => ({ id, label: id.split("/").pop() }));
  }
}

export const openRouterProvider = new OpenRouterProvider();
