/**
 * Integration Core — barrel export.
 *
 * Import from here in routes and other services:
 *   import { integrationRegistry, bootstrapIntegrationCore } from "@/services/integration-core/index.js"
 */

export type {
  IntegrationCategory, ConnectionState, RateLimitStatus, IntegrationRegistryEntry,
  IIntegrationTestResult, IIntegration, IntegrationEventType, IntegrationEvent,
} from "./types.js";

export { integrationRegistry }      from "./registry.js";
export { integrationEventBus }      from "./event-bus.js";
export { integrationActivityLogger } from "./activity-logger.js";
export type { IntegrationActivityEntry } from "./activity-logger.js";
export { metricsCollector }         from "./metrics-collector.js";
export type { MetricSnapshot }      from "./metrics-collector.js";
export { withRetry, defaultIsRetryable } from "./retry-engine.js";
export { bootstrapIntegrationCore } from "./bootstrap.js";

export { AiAdapter }       from "./adapters/ai-adapter.js";
export { ResearchAdapter } from "./adapters/research-adapter.js";
export { StubAdapter }     from "./adapters/stub-adapter.js";
