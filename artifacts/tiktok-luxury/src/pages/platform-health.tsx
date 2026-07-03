import { useCallback, useEffect, useState } from "react";
import {
  Activity, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Server, Cpu, Plug, Clock, Database, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

// ── Types (mirrors api-server response shapes) ──────────────────────────────

type ProviderStatus = "connected" | "disconnected" | "unconfigured" | "rate_limited" | "error" | "initializing";

interface ProviderInfo {
  id: string;
  name: string;
  status: ProviderStatus;
  configured: boolean;
  lastHealth?: { status: ProviderStatus; latencyMs?: number; error?: string; timestamp: string };
}

interface ScheduledTask {
  id: string;
  name: string;
  intervalMs: number | null;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: "success" | "error";
  lastError?: string;
  runCount: number;
  enabled: boolean;
}

type ConnectionState = "connected" | "disconnected" | "unconfigured" | "rate_limited" | "error" | "initializing" | "stub_not_implemented";

interface IntegrationRegistryEntry {
  id: string;
  name: string;
  category: "ai" | "research" | "social";
  status: ConnectionState;
  avgResponseTimeMs?: number;
  lastFailureAt?: string;
}

interface StatusResponse {
  providers: ProviderInfo[];
  lastHealthRun?: string;
  configuredCount: number;
  connectedCount: number;
  scheduler: ScheduledTask[];
  jobs: { total: number; succeeded: number; failed: number; pending?: number };
  timestamp: string;
}

interface RegistryResponse {
  integrations: IntegrationRegistryEntry[];
  summary: { connected: number; total: number };
  timestamp: string;
}

type SupabaseState = "checking" | "connected" | "unreachable" | "not-configured";

const OK_STATES = new Set(["connected"]);
const WARN_STATES = new Set(["rate_limited", "initializing", "unconfigured", "stub_not_implemented"]);

function statusTone(status: string): string {
  if (OK_STATES.has(status)) return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
  if (WARN_STATES.has(status)) return "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return "text-red-400 border-red-400/30 bg-red-400/10";
}

function statusIcon(status: string) {
  if (OK_STATES.has(status)) return CheckCircle2;
  if (WARN_STATES.has(status)) return AlertTriangle;
  return XCircle;
}

function fmtWhen(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function PlatformHealthPage() {
  const [apiUp, setApiUp] = useState<"checking" | "up" | "down">("checking");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [registry, setRegistry] = useState<RegistryResponse | null>(null);
  const [supabaseState, setSupabaseState] = useState<SupabaseState>("checking");
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const checkSupabase = useCallback(async () => {
    if (!supabase) {
      setSupabaseState("not-configured");
      return;
    }
    try {
      const { error } = await supabase.auth.getSession();
      setSupabaseState(error ? "unreachable" : "connected");
    } catch {
      setSupabaseState("unreachable");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthzRes, statusRes, registryRes] = await Promise.all([
        fetch("/api/healthz").then(r => (r.ok ? "up" : "down")).catch(() => "down"),
        fetch("/api/intelligence/status").then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/integration-core/registry").then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setApiUp(healthzRes as "up" | "down");
      setStatus(statusRes);
      setRegistry(registryRes);
      await checkSupabase();
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, [checkSupabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const runLiveCheck = useCallback(async () => {
    setRunningCheck(true);
    try {
      await fetch("/api/intelligence/health");
      await load();
      void logAudit({ action: "Ran live platform health check", module: "platform-health" });
    } finally {
      setRunningCheck(false);
    }
  }, [load]);

  const overall: "ok" | "degraded" | "down" =
    apiUp === "down"
      ? "down"
      : supabaseState === "unreachable" || (status && status.connectedCount === 0)
      ? "degraded"
      : "ok";

  const overallCopy = {
    ok:       { label: "All Systems Operational", tone: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: CheckCircle2 },
    degraded: { label: "Degraded — Some Services Unavailable", tone: "text-amber-400 border-amber-400/30 bg-amber-400/10", icon: AlertTriangle },
    down:     { label: "API Server Unreachable", tone: "text-red-400 border-red-400/30 bg-red-400/10", icon: XCircle },
  }[overall];
  const OverallIcon = overallCopy.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 8</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">
            Platform Health
          </h1>
          <p className="text-muted-foreground text-sm">
            Live status for the API server, AI providers, research integrations, and Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void runLiveCheck()}
            disabled={runningCheck || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition disabled:opacity-50"
          >
            {runningCheck ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            {runningCheck ? "Checking Providers…" : "Run Live Check"}
          </button>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      <div className={cn("luxury-card px-5 py-4 flex items-center gap-3 border", overallCopy.tone)}>
        <OverallIcon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{overallCopy.label}</p>
          {lastRefreshed && (
            <p className="text-xs opacity-70 mt-0.5">Last checked {lastRefreshed.toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="luxury-card px-5 py-4 flex items-center gap-3">
          <Server className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">API Server</p>
            <p className={cn("text-sm font-semibold mt-0.5", apiUp === "up" ? "text-emerald-400" : apiUp === "down" ? "text-red-400" : "text-muted-foreground")}>
              {apiUp === "checking" ? "Checking…" : apiUp === "up" ? "Online" : "Unreachable"}
            </p>
          </div>
        </div>
        <div className="luxury-card px-5 py-4 flex items-center gap-3">
          <Database className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Supabase</p>
            <p className={cn(
              "text-sm font-semibold mt-0.5",
              supabaseState === "connected" ? "text-emerald-400" :
              supabaseState === "not-configured" ? "text-muted-foreground" : "text-red-400",
            )}>
              {supabaseState === "checking" ? "Checking…" :
               supabaseState === "connected" ? "Connected" :
               supabaseState === "not-configured" ? "Not Configured" : "Unreachable"}
            </p>
          </div>
        </div>
        <div className="luxury-card px-5 py-4 flex items-center gap-3">
          <Cpu className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Providers</p>
            <p className="text-sm font-semibold mt-0.5 text-foreground">
              {status ? `${status.connectedCount} / ${status.configuredCount} connected` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Providers ── */}
      <div className="luxury-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Cpu className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI Providers</h2>
          {status?.lastHealthRun && (
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              Last checked {fmtWhen(status.lastHealthRun)}
            </span>
          )}
        </div>
        {loading && !status ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(status?.providers ?? []).map(p => {
              const Icon = statusIcon(p.status);
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium">{p.name}</p>
                    {p.lastHealth?.latencyMs != null && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.lastHealth.latencyMs}ms</p>
                    )}
                  </div>
                  <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", statusTone(p.status))}>
                    <Icon className="h-3 w-3" /> {p.status.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Research / Social Integrations ── */}
      <div className="luxury-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Plug className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Research & Social Integrations</h2>
          {registry?.summary && (
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {registry.summary.connected} / {registry.summary.total} connected
            </span>
          )}
        </div>
        {loading && !registry ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(registry?.integrations ?? []).map(entry => {
              const Icon = statusIcon(entry.status);
              return (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{entry.category}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entry.avgResponseTimeMs != null && (
                      <span className="text-[10px] text-muted-foreground font-mono">{Math.round(entry.avgResponseTimeMs)}ms avg</span>
                    )}
                    <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", statusTone(entry.status))}>
                      <Icon className="h-3 w-3" /> {entry.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scheduler ── */}
      <div className="luxury-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Background Scheduler</h2>
          {status?.jobs && (
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {status.jobs.succeeded} succeeded · {status.jobs.failed} failed
            </span>
          )}
        </div>
        {loading && !status ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(status?.scheduler ?? []).map(task => {
              const tone = task.lastStatus === "error"
                ? "text-red-400 border-red-400/30 bg-red-400/10"
                : task.lastStatus === "success"
                ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                : "text-muted-foreground border-border bg-muted/10";
              return (
                <div key={task.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium">{task.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last run {fmtWhen(task.lastRunAt)} · {task.runCount} runs
                      {task.lastError && <span className="text-red-400"> · {task.lastError}</span>}
                    </p>
                  </div>
                  <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize flex-shrink-0", tone)}>
                    {task.enabled ? (task.lastStatus ?? "pending") : "disabled"}
                  </span>
                </div>
              );
            })}
            {(status?.scheduler ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
                <ShieldCheck className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No scheduled tasks reported.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
