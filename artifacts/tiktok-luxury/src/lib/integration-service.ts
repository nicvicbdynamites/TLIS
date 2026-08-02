/**
 * Integration Service — Phase 3A frontend client.
 *
 * Provides React hooks that consume the `/api/integration-core/*` endpoints
 * built in the API server's Integration Core (Provider Registry).
 *
 * Hand-written (no Orval codegen) mirroring the `intelligence-service.ts`
 * pattern used for Phase 2.
 *
 * Usage:
 *   const { integrations, summary, loading } = useIntegrationRegistry();
 *   const { activity } = useIntegrationActivity();
 *   const result = await testIntegrationConnection("gemini");
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types mirrored from api-server integration-core ─────────────────────────

export type IntegrationCategory = "ai" | "research" | "social";

export type IntegrationConnectionState =
  | "connected"
  | "disconnected"
  | "unconfigured"
  | "rate_limited"
  | "error"
  | "initializing"
  | "stub_not_implemented";

export interface IntegrationRateLimitStatus {
  limited: boolean;
  until?: string;
}

export interface IntegrationEntry {
  id:                  string;
  name:                string;
  category:            IntegrationCategory;
  status:              IntegrationConnectionState;
  connectionState:     IntegrationConnectionState;
  apiVersion?:         string;
  lastHealthCheckAt?:  string;
  lastSuccessAt?:      string;
  lastFailureAt?:      string;
  avgResponseTimeMs?:  number;
  retryCount:          number;
  rateLimitStatus:     IntegrationRateLimitStatus;
  schedulerEnabled:    boolean;
  priority:            number;
  costTrackingEnabled: boolean;
  streamingSupported:  boolean;
}

export interface IntegrationRegistrySummary {
  total:      number;
  connected:  number;
  configured: number;
  byCategory: Record<string, number>;
}

export interface IntegrationRegistryResponse {
  integrations: IntegrationEntry[];
  summary:      IntegrationRegistrySummary;
  timestamp:    string;
}

export interface IntegrationActivityEntry {
  id:            string;
  integrationId: string;
  category:      IntegrationCategory;
  action:        string;
  status:        "success" | "warning" | "error";
  detail?:       string;
  latencyMs?:    number;
  timestamp:     string;
}

export interface IntegrationTestResult {
  ok:         boolean;
  success:    boolean;
  message?:   string;
  latencyMs?: number;
  timestamp?: string;
}

// ── Helper: connection state → display status ───────────────────────────────

export function integrationStatusToDisplay(
  status: IntegrationConnectionState,
): "Connected" | "Disconnected" | "Configure" | "Fallback" | "Error" | "Pending" {
  switch (status) {
    case "connected":            return "Connected";
    case "unconfigured":         return "Configure";
    case "stub_not_implemented": return "Configure";
    case "rate_limited":         return "Fallback";
    case "error":                return "Error";
    case "initializing":         return "Pending";
    default:                     return "Disconnected";
  }
}

// ── useIntegrationRegistry ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;

const EMPTY_REGISTRY: IntegrationRegistryResponse = {
  integrations: [],
  summary: { total: 0, connected: 0, configured: 0, byCategory: {} },
  timestamp: "",
};

export function useIntegrationRegistry(): IntegrationRegistryResponse & { loading: boolean; refresh: () => void } {
  const [data,    setData]    = useState<IntegrationRegistryResponse>(EMPTY_REGISTRY);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/integration-core/registry");
      if (!res.ok) return;
      const json = await res.json() as IntegrationRegistryResponse;
      setData(json);
    } catch {
      // Network error — keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch_]);

  return { ...data, loading, refresh: fetch_ };
}

// ── useIntegrationActivity ────────────────────────────────────────────────

export function useIntegrationActivity(limit = 20): { activity: IntegrationActivityEntry[]; loading: boolean; refresh: () => void } {
  const [activity, setActivity] = useState<IntegrationActivityEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/integration-core/activity?limit=${limit}`);
      if (!res.ok) return;
      const json = await res.json() as { activity: IntegrationActivityEntry[] };
      setActivity(json.activity ?? []);
    } catch {
      // Network error — keep previous data
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch_]);

  return { activity, loading, refresh: fetch_ };
}

// ── Manual "Test Connection" trigger ─────────────────────────────────────

export async function testIntegrationConnection(id: string): Promise<IntegrationTestResult> {
  try {
    const res = await fetch(`/api/integration-core/${id}/test`, { method: "POST" });
    const data = await res.json() as {
      ok?: boolean;
      error?: string;
      result?: { success: boolean; message?: string; error?: string; latencyMs?: number; timestamp?: string };
    };
    if (!res.ok || !data.ok) {
      return { ok: false, success: false, message: data.error ?? data.result?.error ?? "Test failed" };
    }
    return {
      ok:         true,
      success:    !!data.result?.success,
      message:    data.result?.message ?? data.result?.error,
      latencyMs:  data.result?.latencyMs,
      timestamp:  data.result?.timestamp,
    };
  } catch (e: any) {
    return { ok: false, success: false, message: String(e?.message ?? "Network error") };
  }
}
