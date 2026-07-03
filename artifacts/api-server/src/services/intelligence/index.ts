/**
 * Intelligence Service Layer — barrel export.
 *
 * Import from here in routes and services:
 *   import { providerManager, aiRouter } from "@/services/intelligence/index.js"
 */

export type {
  IProvider, ProviderStatus, ProviderInfo, HealthResult,
  GenerateOpts, GenerateResult, AnalyzeResult, StreamChunk,
  StructuredOutputOpts, StructuredOutputResult,
  ImageGenOpts, ImageGenResult,
  ModelInfo, CostEstimate, UsageStats,
} from "./interface.js";
export { BaseAiProvider } from "./base-provider.js";
export { resolvePricing, estimateCostUsd, MODEL_PRICING, PROVIDER_DEFAULT_PRICING } from "./pricing.js";

export { geminiProvider     } from "./gemini-provider.js";
export { openAIProvider     } from "./openai-provider.js";
export { claudeProvider     } from "./claude-provider.js";
export { deepSeekProvider   } from "./deepseek-provider.js";
export { grokProvider       } from "./grok-provider.js";
export { mistralProvider    } from "./mistral-provider.js";
export { openRouterProvider } from "./openrouter-provider.js";
