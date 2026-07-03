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
  /** Override the provider's default model (ignored by providers that don't support it, e.g. Gemini's cascade) */
  model?:        string;
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

// ── Structured Output (Phase 4A) ────────────────────────────────────────────

export interface StructuredOutputOpts extends GenerateOpts {
  /** Human-readable description of the desired JSON shape, injected into the prompt */
  schemaDescription?: string;
}

export interface StructuredOutputResult<T = unknown> {
  data:      T;
  raw:       string;
  provider:  string;
  model:     string;
  latencyMs: number;
}

// ── Image Generation (Phase 4A) ─────────────────────────────────────────────

export interface ImageGenOpts {
  size?:    string;
  quality?: string;
  n?:       number;
}

export interface ImageGenResult {
  /** Base64-encoded images or URLs, provider-dependent */
  images:    string[];
  provider:  string;
  model:     string;
  latencyMs: number;
}

// ── Models / Cost / Usage (Phase 4A) ────────────────────────────────────────

export interface ModelInfo {
  id:              string;
  label?:          string;
  contextWindow?:  number;
  supportsImages?: boolean;
}

export interface CostEstimate {
  provider:         string;
  model?:           string;
  inputTokens:      number;
  outputTokens:     number;
  estimatedCostUsd: number;
}

export interface UsageStats {
  provider:          string;
  totalRequests:     number;
  totalInputTokens:  number;
  totalOutputTokens: number;
  totalCostUsd:      number;
  avgLatencyMs:      number;
  successRate:       number;
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

  // ── Phase 4A: unified orchestration surface ───────────────────────────────
  // These are additive — every provider gets a working default via
  // BaseAiProvider, built on top of the methods above. Concrete providers may
  // override any of them for provider-specific behaviour.

  /** Alias for connect() — used by the AI Provider Manager's unified lifecycle */
  initialize(): Promise<void>;

  /** Alias for health() — used by orchestration/health-monitoring callers */
  healthCheck(): Promise<HealthResult>;

  /** Alias for generate() — canonical name used by the AI Router */
  generateText(prompt: string, opts?: GenerateOpts): Promise<GenerateResult>;

  /** Ask the provider for JSON-shaped output; default impl uses JSON-mode prompting + parsing */
  generateStructuredOutput<T = unknown>(
    prompt: string,
    opts?: StructuredOutputOpts,
  ): Promise<StructuredOutputResult<T>>;

  /** Generate image(s); providers without image support should reject with a clear error */
  generateImage(prompt: string, opts?: ImageGenOpts): Promise<ImageGenResult>;

  /** List the models this provider exposes */
  listModels(): ModelInfo[] | Promise<ModelInfo[]>;

  /** Estimate the cost of a request given token counts (does not make a network call) */
  estimateCost(inputTokens: number, outputTokens: number, model?: string): CostEstimate;

  /** Aggregate usage/cost/latency statistics for this provider */
  usageStatistics(): UsageStats;
}
