/**
 * TLIS Intelligence Service Layer — Common Provider Interface (Phase 2)
 *
 * Every AI provider (Gemini, OpenAI, Claude, DeepSeek, Grok, Mistral) implements
 * IProvider so ProviderManager can orchestrate them uniformly: health-check,
 * failover, rate-limit tracking, and cost logging without touching page code.
 */

// ── Provider Status ────────────────────────────────────────────────────────

export type ProviderStatus =
  | "connected"
  | "disconnected"
  | "unconfigured"
  | "rate_limited"
  | "error"
  | "initializing";

// ── Health ─────────────────────────────────────────────────────────────────

export interface HealthResult {
  status:     ProviderStatus;
  latencyMs?: number;
  model?:     string;
  error?:     string;
  timestamp:  string;
}

// ── Generate / Analyze ─────────────────────────────────────────────────────

export interface GenerateOpts {
  maxTokens?:    number;
  temperature?:  number;
  systemPrompt?: string;
  /** If true, provider may return cached result */
  allowCache?:   boolean;
}

export interface GenerateResult {
  text:          string;
  model:         string;
  provider:      string;
  inputTokens?:  number;
  outputTokens?: number;
  latencyMs:     number;
  cached?:       boolean;
}

export interface AnalyzeResult {
  analysis:   string;
  confidence: number;
  provider:   string;
  model:      string;
  latencyMs:  number;
}

// ── Streaming ──────────────────────────────────────────────────────────────

export interface StreamChunk {
  text:     string;
  done:     boolean;
  provider: string;
}

// ── Provider Info (for serialisation) ─────────────────────────────────────

export interface ProviderInfo {
  id:          string;
  name:        string;
  description: string;
  models:      string[];
  priority:    number;
  status:      ProviderStatus;
  configured:  boolean;
  lastHealth?: HealthResult;
  rateLimited?: boolean;
  rateLimitUntil?: string;
}

// ── Core Interface ─────────────────────────────────────────────────────────

export interface IProvider {
  readonly id:          string;
  readonly name:        string;
  readonly description: string;
  readonly models:      readonly string[];
  readonly priority:    number;

  /** Returns true if the required API key is present in env */
  isConfigured(): boolean;

  /** Optional: perform any async initialisation */
  connect(): Promise<void>;

  /** Optional: release resources */
  disconnect(): Promise<void>;

  /** Ping the provider — must never throw */
  health(): Promise<HealthResult>;

  /** Generate text from a prompt */
  generate(prompt: string, opts?: GenerateOpts): Promise<GenerateResult>;

  /** Structured analysis of a piece of content */
  analyze(content: string, task: string, opts?: GenerateOpts): Promise<AnalyzeResult>;

  /** Stream text, calling onChunk for each delta; resolves when done */
  stream(
    prompt: string,
    onChunk: (chunk: StreamChunk) => void,
    opts?: GenerateOpts,
  ): Promise<void>;

  /** Synchronous snapshot of provider state */
  status(): ProviderStatus;

  /** Serialisable info for the /intelligence/status endpoint */
  getInfo(): ProviderInfo;
}
