/**
 * Intelligence Service — Phase 2 frontend client.
 *
 * Provides React hooks that consume the `/api/intelligence/*` endpoints
 * built in the API server's Intelligence Service Layer.
 *
 * Usage:
 *   const { providers, logs, jobs, scheduler, notifications } = useIntelligenceStatus();
 *   const { response, loading, error, send } = useIntelligenceCommand();
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types mirrored from api-server ─────────────────────────────────────────

export type ProviderStatus =
  | "connected"
  | "disconnected"
  | "unconfigured"
  | "rate_limited"
  | "error"
  | "initializing";

export interface ProviderInfo {
  id:          string;
  name:        string;
  description: string;
  models:      string[];
  priority:    number;
  status:      ProviderStatus;
  configured:  boolean;
  lastHealth?: {
    status:     ProviderStatus;
    latencyMs?: number;
    model?:     string;
    error?:     string;
    timestamp:  string;
  };
}

export interface IntelligenceLog {
  id:            string;
  timestamp:     string;
  provider:      string;
  requestType:   string;
  prompt?:       string;
  latencyMs:     number;
  status:        "success" | "error" | "timeout" | "cached" | "fallback";
  error?:        string;
  model?:        string;
  inputTokens?:  number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface ScheduledTask {
  id:          string;
  name:        string;
  intervalMs:  number | null;
  lastRunAt?:  string;
  nextRunAt?:  string;
  lastStatus?: "success" | "error";
  lastError?:  string;
  runCount:    number;
  enabled:     boolean;
}

export interface Notification {
  id:        string;
  type:      string;
  title:     string;
  message:   string;
  severity:  "info" | "warning" | "error" | "success";
  timestamp: string;
  read:      boolean;
  provider?: string;
}

export interface JobStats {
  pending:   number;
  running:   number;
  completed: number;
  failed:    number;
  retrying:  number;
  total:     number;
}

export interface RouterStats {
  totalRequests: number;
  cacheHits:     number;
  cacheSize:     number;
  failovers:     number;
  errors:        number;
  avgLatencyMs:  number;
  providerUsage: Record<string, number>;
}

export interface LogStats {
  total:          number;
  last24hTotal:   number;
  avgLatencyMs:   number;
  successRate:    number;
  estimatedCostUsd: number;
  byProvider:     Record<string, { count: number; avgLatencyMs: number; errors: number }>;
}

export interface SecretStatus {
  key:        string;
  provider:   string;
  configured: boolean;
}

export interface IntelligenceStatus {
  providers:       ProviderInfo[];
  lastHealthRun?:  string;
  configuredCount: number;
  connectedCount:  number;
  router:          RouterStats | null;
  logs:            LogStats | null;
  jobs:            JobStats | null;
  scheduler:       ScheduledTask[];
  secrets:         SecretStatus[];
  notifications:   Notification[];
  timestamp?:      string;
}

// ── Helper: convert ProviderStatus → display integration status ────────────

export function providerStatusToDisplay(
  status: ProviderStatus,
): "Connected" | "Disconnected" | "Configure" | "Fallback" | "Error" {
  switch (status) {
    case "connected":    return "Connected";
    case "unconfigured": return "Configure";
    case "rate_limited": return "Fallback";
    case "error":        return "Error";
    default:             return "Disconnected";
  }
}

// ── useIntelligenceStatus ──────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;

const EMPTY_STATUS: IntelligenceStatus = {
  providers: [], configuredCount: 0, connectedCount: 0,
  router: null, logs: null, jobs: null, scheduler: [], secrets: [], notifications: [],
};

export function useIntelligenceStatus(): IntelligenceStatus & { loading: boolean; refresh: () => void } {
  const [status,  setStatus]  = useState<IntelligenceStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/status");
      if (!res.ok) return;
      const data = await res.json() as IntelligenceStatus;
      setStatus(data);
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

  return { ...status, loading, refresh: fetch_ };
}

// ── useIntelligenceCommand ─────────────────────────────────────────────────

export interface CommandResult {
  response:  string;
  provider:  string;
  model:     string;
  latencyMs: number;
}

export function useIntelligenceCommand(): {
  result:    CommandResult | null;
  loading:   boolean;
  error:     string | null;
  send:      (command: string, preferredProvider?: string) => Promise<CommandResult | null>;
  clear:     () => void;
} {
  const [result,  setResult]  = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const send = useCallback(async (
    command: string,
    preferredProvider?: string,
  ): Promise<CommandResult | null> => {
    if (!command.trim()) return null;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/intelligence/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: command.trim(), preferredProvider }),
      });
      const data = await res.json() as { response?: string; provider?: string; model?: string; latencyMs?: number; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Command failed");
        return null;
      }
      const r: CommandResult = {
        response:  data.response  ?? "",
        provider:  data.provider  ?? "gemini",
        model:     data.model     ?? "",
        latencyMs: data.latencyMs ?? 0,
      };
      setResult(r);
      return r;
    } catch (e: any) {
      setError(String(e?.message ?? "Network error"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, loading, error, send, clear };
}

// ── Trigger a manual scheduler run ────────────────────────────────────────

export async function triggerSchedulerTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/intelligence/scheduler/${taskId}/run`, { method: "POST" });
    return res.ok;
  } catch { return false; }
}

// ── Clear AI router cache ──────────────────────────────────────────────────

export async function clearIntelligenceCache(): Promise<boolean> {
  try {
    const res = await fetch("/api/intelligence/cache/clear", { method: "POST" });
    return res.ok;
  } catch { return false; }
}
