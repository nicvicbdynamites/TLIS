/**
 * AI Pricing Table — Phase 4A Cost Tracking Service support.
 *
 * Replaces the old flat per-provider rate in intelligence-logger.ts with a
 * per-model table (falls back to a per-provider default when the model is
 * unknown). Rates are USD per 1,000 tokens and are approximate — intended
 * for cost *estimation* and dashboards, not billing reconciliation.
 */

export interface ModelPricing {
  inputPer1k:  number;
  outputPer1k: number;
}

// ── Per-model pricing (USD / 1K tokens) ─────────────────────────────────────

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  "gemini-2.5-flash":      { inputPer1k: 0.00015, outputPer1k: 0.00060 },
  "gemini-2.0-flash":      { inputPer1k: 0.00010, outputPer1k: 0.00040 },
  "gemini-2.0-flash-lite": { inputPer1k: 0.000075, outputPer1k: 0.00030 },

  // OpenAI
  "gpt-4o-mini":    { inputPer1k: 0.00015, outputPer1k: 0.00060 },
  "gpt-3.5-turbo":  { inputPer1k: 0.00050, outputPer1k: 0.00150 },

  // Anthropic Claude
  "claude-3-5-haiku-20241022": { inputPer1k: 0.00080, outputPer1k: 0.00400 },
  "claude-3-haiku-20240307":   { inputPer1k: 0.00025, outputPer1k: 0.00125 },

  // DeepSeek
  "deepseek-chat": { inputPer1k: 0.00014, outputPer1k: 0.00028 },

  // xAI Grok
  "grok-beta": { inputPer1k: 0.00200, outputPer1k: 0.01000 },

  // Mistral
  "mistral-small-latest": { inputPer1k: 0.00020, outputPer1k: 0.00060 },
  "mistral-tiny":         { inputPer1k: 0.00014, outputPer1k: 0.00042 },
};

// ── Per-provider fallback (used when the specific model isn't in the table
//    above — e.g. an OpenRouter model id we haven't priced individually) ───

export const PROVIDER_DEFAULT_PRICING: Record<string, ModelPricing> = {
  gemini:     { inputPer1k: 0.00015, outputPer1k: 0.00060 },
  openai:     { inputPer1k: 0.00060, outputPer1k: 0.00060 },
  claude:     { inputPer1k: 0.00300, outputPer1k: 0.00300 },
  deepseek:   { inputPer1k: 0.00014, outputPer1k: 0.00014 },
  grok:       { inputPer1k: 0.00200, outputPer1k: 0.00200 },
  mistral:    { inputPer1k: 0.00020, outputPer1k: 0.00020 },
  openrouter: { inputPer1k: 0.00050, outputPer1k: 0.00150 },
};

/** Resolve the best-known pricing for a (provider, model) pair. */
export function resolvePricing(provider: string, model?: string): ModelPricing | undefined {
  if (model && MODEL_PRICING[model]) return MODEL_PRICING[model];
  return PROVIDER_DEFAULT_PRICING[provider];
}

/** Estimate cost in USD given token counts. Returns 0 if pricing is unknown. */
export function estimateCostUsd(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  model?: string,
): number {
  const pricing = resolvePricing(provider, model);
  if (!pricing) return 0;
  const cost = (inputTokens / 1000) * pricing.inputPer1k + (outputTokens / 1000) * pricing.outputPer1k;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
