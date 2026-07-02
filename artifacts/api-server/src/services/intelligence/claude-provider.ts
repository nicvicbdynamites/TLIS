/**
 * Claude Provider — Anthropic Claude 3.5 Haiku. Priority 3.
 * Uses native fetch against the Anthropic Messages API.
 */

import type {
  IProvider, ProviderStatus, ProviderInfo, HealthResult,
  GenerateOpts, GenerateResult, AnalyzeResult, StreamChunk,
} from "./interface.js";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const DEFAULT_MODEL  = "claude-3-5-haiku-20241022";

export class ClaudeProvider implements IProvider {
  readonly id          = "claude";
  readonly name        = "Anthropic Claude";
  readonly description = "Claude 3.5 Haiku — fast, affordable Anthropic model";
  readonly models      = ["claude-3-5-haiku-20241022", "claude-3-haiku-20240307"] as const;
  readonly priority    = 3;

  private _status: ProviderStatus = "initializing";
  private _lastHealth?: HealthResult;

  private get apiKey(): string | undefined {
    return process.env["ANTHROPIC_API_KEY"]?.trim() || undefined;
  }

  private headers() {
    return {
      "Content-Type":      "application/json",
      "x-api-key":         this.apiKey ?? "",
      "anthropic-version": "2023-06-01",
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
      const resp = await fetch(`${ANTHROPIC_BASE}/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(8000),
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
    if (!this.isConfigured()) throw new Error("ANTHROPIC_API_KEY not configured");
    const start = Date.now();
    const body: Record<string, unknown> = {
      model:       DEFAULT_MODEL,
      max_tokens:  opts?.maxTokens  ?? 1024,
      temperature: opts?.temperature ?? 0.7,
      messages:    [{ role: "user", content: prompt }],
    };
    if (opts?.systemPrompt) body["system"] = opts.systemPrompt;

    const resp = await fetch(`${ANTHROPIC_BASE}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Claude ${resp.status}: ${txt.slice(0, 120)}`);
    }
    const data = await resp.json() as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      text:         data.content.find(c => c.type === "text")?.text ?? "",
      model:        data.model,
      provider:     this.id,
      inputTokens:  data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      latencyMs:    Date.now() - start,
    };
  }

  async analyze(content: string, task: string, opts?: GenerateOpts): Promise<AnalyzeResult> {
    const prompt = `Task: ${task}\n\nContent:\n${content}`;
    const start  = Date.now();
    const result = await this.generate(prompt, { ...opts, maxTokens: 512 });
    return {
      analysis: result.text, confidence: 82, provider: this.id,
      model: result.model, latencyMs: Date.now() - start,
    };
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
}

export const claudeProvider = new ClaudeProvider();
