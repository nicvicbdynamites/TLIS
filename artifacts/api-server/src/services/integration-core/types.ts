/**
 * Integration Core — Common Types (Phase 3A)
 *
 * The Integration Core is a thin facade over existing provider singletons
 * (providerManager, google-trends/reddit/ahrefs/search-console, secretsManager).
 * It does NOT duplicate their state — adapters read from those singletons on
 * demand and the registry caches only a lightweight status snapshot for the
 * `/api/integration-core/*` endpoints.
 */

// ── Category & Connection State ─────────────────────────────────────────────

export type IntegrationCategory = "ai" | "research" | "social";

/**
 * Superset of the existing AI `ProviderStatus` values plus `stub_not_implemented`
 * for providers that have no backend implementation yet (semrush/tiktok/
 * instagram/youtube/pinterest) — kept string-compatible so AI adapters can pass
 * their status straight through without translation.
 */
export type ConnectionState =
  | "connected"
  | "disconnected"
  | "unconfigured"
  | "rate_limited"
  | "error"
  | "initializing"
  | "stub_not_implemented";

export interface RateLimitStatus {
  limited: boolean;
  until?: string;
}

// ── Registry Entry (15 fields + id) ─────────────────────────────────────────

export interface IntegrationRegistryEntry {
  id:                   string;
  name:                 string;
  category:             IntegrationCategory;
  status:               ConnectionState;
  connectionState:      ConnectionState;
  apiVersion?:          string;
  lastHealthCheckAt?:   string;
  lastSuccessAt?:       string;
  lastFailureAt?:       string;
  avgResponseTimeMs?:   number;
  retryCount:           number;
  rateLimitStatus:      RateLimitStatus;
  schedulerEnabled:     boolean;
  priority:             number;
  costTrackingEnabled:  boolean;
  streamingSupported:   boolean;
}

// ── Adapter Test/Health Result ──────────────────────────────────────────────

export interface IIntegrationTestResult {
  success:         boolean;
  latencyMs?:      number;
  message?:        string;
  error?:          string;
  timestamp:       string;
  /** Lets an adapter report a precise ConnectionState (e.g. rate_limited). */
  statusOverride?: ConnectionState;
}

// ── Adapter Interface ────────────────────────────────────────────────────────

export interface IIntegration {
  readonly id:                  string;
  readonly name:                string;
  readonly category:            IntegrationCategory;
  readonly capabilities:        string[];
  readonly priority:            number;
  readonly schedulerEnabled:    boolean;
  readonly costTrackingEnabled: boolean;
  readonly streamingSupported:  boolean;

  isConfigured(): boolean;

  /** On-demand live check — used by manual "Test Connection" actions. */
  testConnection(): Promise<IIntegrationTestResult>;

  /**
   * Periodic health snapshot. AI adapters MUST implement this as a cache-only
   * read (no network call) since AI health checks are already driven by the
   * scheduler's `ai-health` task via providerManager — never duplicate that call.
   */
  healthCheck(): Promise<IIntegrationTestResult>;

  getApiVersion?(): string | undefined;
}

// ── Event Bus ────────────────────────────────────────────────────────────────

export type IntegrationEventType =
  | "integration.registered"
  | "integration.status_changed"
  | "integration.health_check"
  | "integration.test"
  | "integration.error";

export interface IntegrationEvent<T = unknown> {
  type:          IntegrationEventType;
  integrationId: string;
  timestamp:     string;
  payload?:      T;
}
