/**
 * OpenAI Provider — GPT-4o-mini primary, gpt-3.5-turbo fallback. Priority 2.
 * Uses the `openai` SDK (already installed in api-server).
 */

import type {
  IProvider, ProviderStatus, ProviderInfo, HealthResult,
  GenerateOpts, GenerateResult, AnalyzeResult, StreamChunk,
} from "./interface.js";
import { logger as rootLogger } from "../../lib/logger.js";

export class OpenAIProvider implements IProvider {
  readonly id          = "openai";
  readonly name        = "OpenAI";
  readonly description = "GPT-4o-mini with automatic gpt-3.5-turbo fallback";
  readonly models      = ["gpt-4o-mini", "gpt-3.5-turbo"] as const;
  readonly priority    = 2;

  private _status: ProviderStatus = "initializing";
  private _lastHealth?: HealthResult;

  private get apiKey(): string | undefined {
    return process.env["OPENAI_API_KEY"]?.trim() || undefined;
  }

  isConfigured(): boolean { return Boolean(this.apiKey); }

  async connect(): Promise<void> {
    const h = await this.health();
    this._status = h.status;
  }

  async disconnect(): Promise<void> { this._status = "disconnected"; }

  async health(): Promise<HealthResult> {
    if (!this.isConfigured()) {
      const h: HealthResult = { status: "unconfigured", timestamp: new Date().toISOString() };
      this._lastHealth = h; this._status = "unconfigured"; return h;
    }
    const start = Date.now();
    try {
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      const h: HealthResult = {
        status:    resp.ok ? "connected" : resp.status === 429 ? "rate_limited" : "error",
        latencyMs: Date.now() - start,
        model:     "gpt-4o-mini",
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
    if (!this.isConfigured()) throw new Error("OPENAI_API_KEY not configured");
    const start = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (opts?.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: prompt });

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        messages,
        max_tokens:  opts?.maxTokens  ?? 1024,
        temperature: opts?.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`OpenAI ${resp.status}: ${txt.slice(0, 120)}`);
    }
    const data = await resp.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      text:         data.choices[0]?.message.content ?? "",
      model:        data.model,
      provider:     this.id,
      inputTokens:  data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      latencyMs:    Date.now() - start,
    };
  }

  async analyze(content: string, task: string, opts?: GenerateOpts): Promise<AnalyzeResult> {
    const prompt = `Task: ${task}\n\nContent:\n${content}\n\nAnalyse and return confidence (0-100).`;
    const start  = Date.now();
    const result = await this.generate(prompt, { ...opts, maxTokens: 512 });
    return {
      analysis:   result.text,
      confidence: 80,
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
    if (!this.isConfigured()) throw new Error("OPENAI_API_KEY not configured");
    const messages: Array<{ role: string; content: string }> = [];
    if (opts?.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: prompt });

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini", messages, stream: true,
        max_tokens: opts?.maxTokens ?? 1024,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok || !resp.body) {
      const result = await this.generate(prompt, opts);
      onChunk({ text: result.text, done: false, provider: this.id });
      onChunk({ text: "", done: true, provider: this.id });
      return;
    }

    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();
    let   done    = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      const lines = decoder.decode(value ?? new Uint8Array()).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") { onChunk({ text: "", done: true, provider: this.id }); return; }
        try {
          const parsed = JSON.parse(raw) as { choices: Array<{ delta?: { content?: string } }> };
          const text   = parsed.choices[0]?.delta?.content ?? "";
          if (text) onChunk({ text, done: false, provider: this.id });
        } catch { /* skip malformed */ }
      }
    }
    rootLogger.debug("openai stream completed");
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

export const openAIProvider = new OpenAIProvider();
