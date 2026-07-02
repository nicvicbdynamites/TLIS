import {
  Plug, BrainCircuit, Bot, Globe, MessageSquare,
  BarChart2, Play, Camera, Grid2X2, Music2,
  Activity, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Clock, Settings, Shield, Zap,
  Database, Lock, Unlock, ExternalLink, ChevronRight,
  Radio, TrendingUp, Search, Download, RotateCcw,
} from "lucide-react";
import { useState, useCallback } from "react";
import { aiService, type ConnectionTestResult } from "@/lib/ai-provider";

// ── Types ─────────────────────────────────────────────────────────────────

type ConnStatus = "Connected" | "Disconnected" | "Error" | "Pending";
type JobStatus  = "running" | "waiting" | "failed" | "completed";

// ── Overview ──────────────────────────────────────────────────────────────

const OVERVIEW = {
  connected:    2,
  disconnected: 10,
  apiHealth:    72,
  lastSync:     "3 min ago",
  activeJobs:   2,
};

// ── AI Providers ──────────────────────────────────────────────────────────

interface AIProvider {
  name:         string;
  icon:         React.ElementType;
  status:       ConnStatus;
  keyConfigured: boolean;
  keyName:      string;
  lastRequest:  string;
  lastResponse: string;
  health:       number;
  model:        string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    name:          "Gemini",
    icon:          BrainCircuit,
    status:        "Connected",
    keyConfigured: true,
    keyName:       "GEMINI_API_KEY",
    lastRequest:   "2 min ago",
    lastResponse:  "200 OK · 1.2s",
    health:        97,
    model:         "gemini-2.0-flash",
  },
  {
    name:          "OpenAI",
    icon:          Bot,
    status:        "Disconnected",
    keyConfigured: false,
    keyName:       "OPENAI_API_KEY",
    lastRequest:   "—",
    lastResponse:  "—",
    health:        0,
    model:         "gpt-4o",
  },
];

// ── Research Providers ───────────────────────────────────────────────────

interface ResearchProvider {
  name:      string;
  icon:      React.ElementType;
  status:    ConnStatus;
  syncStatus:string;
  lastSync:  string;
  category:  string;
}

const RESEARCH_PROVIDERS: ResearchProvider[] = [
  { name: "Google Trends",        icon: TrendingUp,   status: "Disconnected", syncStatus: "Not synced", lastSync: "—",          category: "Trends"  },
  { name: "Reddit",               icon: MessageSquare,status: "Disconnected", syncStatus: "Not synced", lastSync: "—",          category: "Social"  },
  { name: "Google Search Console",icon: Globe,        status: "Disconnected", syncStatus: "Not synced", lastSync: "—",          category: "SEO"     },
  { name: "Ahrefs",               icon: BarChart2,    status: "Disconnected", syncStatus: "Not synced", lastSync: "—",          category: "SEO"     },
  { name: "SEMrush",              icon: Search,       status: "Disconnected", syncStatus: "Not synced", lastSync: "—",          category: "SEO"     },
];

// ── Social Providers ─────────────────────────────────────────────────────

const SOCIAL_PROVIDERS = [
  { name: "YouTube",   icon: Play,     status: "Disconnected" as ConnStatus, note: "OAuth 2.0 required"       },
  { name: "Instagram", icon: Camera,   status: "Disconnected" as ConnStatus, note: "Meta Business API"         },
  { name: "Pinterest", icon: Grid2X2,  status: "Disconnected" as ConnStatus, note: "Pinterest API v5"          },
  { name: "TikTok",    icon: Music2,   status: "Disconnected" as ConnStatus, note: "Official TikTok API only"  },
];

// ── Background Jobs ───────────────────────────────────────────────────────

const BG_JOBS: Record<JobStatus, { job: string; detail: string; time: string }[]> = {
  running: [
    { job: "Gemini trend analysis",      detail: "Processing 14 niche signals",    time: "1.8s elapsed" },
    { job: "Keyword opportunity scoring",detail: "842 keywords being scored",       time: "3.2s elapsed" },
  ],
  waiting: [
    { job: "Competitor post indexing",   detail: "Waiting for Competitor module",  time: "Est. 2 min"   },
    { job: "Analytics trend extraction", detail: "Queued behind Gemini job",       time: "Est. 5 min"   },
    { job: "Content calendar refresh",   detail: "Scheduled sync",                 time: "Est. 8 min"   },
  ],
  completed: [
    { job: "Executive Brief generation", detail: "Compiled and surfaced",          time: "2 min ago"    },
    { job: "Prompt vault re-indexing",   detail: "9,440 prompts updated",          time: "5 min ago"    },
    { job: "Hook pattern extraction",    detail: "42 hooks scored",                time: "12 min ago"   },
    { job: "Niche opportunity sweep",    detail: "8 niches evaluated",             time: "20 min ago"   },
  ],
  failed: [
    { job: "Reddit signal ingestion",    detail: "Rate limit — retry in 52 min",  time: "1h ago"       },
    { job: "Ahrefs keyword pull",        detail: "API key not configured",        time: "3h ago"       },
  ],
};

// ── Integration Logs ──────────────────────────────────────────────────────

type LogType = "success" | "error" | "info" | "warning";

const INTEGRATION_LOGS: { ts: string; service: string; action: string; status: LogType; detail: string }[] = [
  { ts: "09:58 PM", service: "Gemini",      action: "Trend analysis",       status: "success", detail: "200 OK · 1.2s · 14 signals" },
  { ts: "09:55 PM", service: "Gemini",      action: "Keyword scoring",      status: "success", detail: "200 OK · 0.8s · 842 keywords" },
  { ts: "09:47 PM", service: "Gemini",      action: "Hook optimisation",    status: "success", detail: "200 OK · 2.1s · 42 hooks" },
  { ts: "09:31 PM", service: "Reddit",      action: "Signal fetch",         status: "error",   detail: "429 Rate Limit — backoff 60 min" },
  { ts: "09:20 PM", service: "Gemini",      action: "Caption optimisation", status: "success", detail: "200 OK · 0.9s · 12 captions" },
  { ts: "09:12 PM", service: "OpenAI",      action: "Connection test",      status: "error",   detail: "401 Unauthorized — key not set" },
  { ts: "08:55 PM", service: "Gemini",      action: "Audience analysis",    status: "success", detail: "200 OK · 1.5s" },
  { ts: "08:30 PM", service: "Ahrefs",      action: "API handshake",        status: "error",   detail: "API key not configured" },
];

const LOG_COLORS: Record<LogType, string> = {
  success: "text-emerald-400",
  error:   "text-red-400",
  info:    "text-chart-2",
  warning: "text-amber-400",
};

const LOG_DOTS: Record<LogType, string> = {
  success: "bg-emerald-400",
  error:   "bg-red-400",
  info:    "bg-chart-2",
  warning: "bg-amber-400",
};

// ── Secrets Status ────────────────────────────────────────────────────────

const SECRETS = [
  { name: "GEMINI_API_KEY",      configured: true,  required: true,  description: "Gemini AI provider"         },
  { name: "SESSION_SECRET",      configured: true,  required: true,  description: "Session authentication"      },
  { name: "DATABASE_URL",        configured: false, required: false, description: "PostgreSQL connection"       },
  { name: "OPENAI_API_KEY",      configured: false, required: false, description: "OpenAI provider"             },
  { name: "REDDIT_CLIENT_ID",    configured: false, required: false, description: "Reddit API access"           },
  { name: "REDDIT_CLIENT_SECRET",configured: false, required: false, description: "Reddit API secret"           },
  { name: "AHREFS_API_KEY",      configured: false, required: false, description: "Ahrefs SEO data"             },
  { name: "SEMRUSH_API_KEY",     configured: false, required: false, description: "SEMrush SEO data"            },
  { name: "TIKTOK_API_KEY",      configured: false, required: false, description: "TikTok official API"         },
];

// ── System Health ─────────────────────────────────────────────────────────

const SYSTEM_HEALTH_MODULES = [
  { name: "AI Layer (Gemini)",      health: 97, status: "Connected"    as ConnStatus },
  { name: "Research Layer",         health: 0,  status: "Disconnected" as ConnStatus },
  { name: "Social Layer",           health: 0,  status: "Disconnected" as ConnStatus },
  { name: "Background Jobs",        health: 88, status: "Connected"    as ConnStatus },
  { name: "Database / Storage",     health: 85, status: "Connected"    as ConnStatus },
  { name: "Authentication",         health: 100,status: "Connected"    as ConnStatus },
];

// ── Sub-components ────────────────────────────────────────────────────────

function ConnBadge({ status }: { status: ConnStatus }) {
  const s: Record<ConnStatus, string> = {
    Connected:    "bg-emerald-400/10 text-emerald-400 border-emerald-400/25",
    Disconnected: "bg-muted/20 text-muted-foreground border-border",
    Error:        "bg-red-400/10 text-red-400 border-red-400/25",
    Pending:      "bg-primary/10 text-primary border-primary/25",
  };
  const dot: Record<ConnStatus, string> = {
    Connected:    "bg-emerald-400",
    Disconnected: "bg-muted-foreground/30",
    Error:        "bg-red-400",
    Pending:      "bg-primary animate-pulse",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${s[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot[status]}`} />
      {status}
    </span>
  );
}

function ConnIcon({ status }: { status: ConnStatus }) {
  if (status === "Connected")    return <CheckCircle2  className="h-4 w-4 text-emerald-400 flex-shrink-0" />;
  if (status === "Error")        return <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />;
  if (status === "Pending")      return <RefreshCw     className="h-4 w-4 text-primary animate-spin flex-shrink-0" />;
  return                                <XCircle       className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />;
}

function HealthBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-emerald-400" : value >= 60 ? "bg-amber-400" : value > 0 ? "bg-red-400" : "bg-muted/30";
  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}

function JobIcon({ status }: { status: JobStatus }) {
  if (status === "running")   return <RefreshCw    className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />;
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />;
  if (status === "failed")    return <XCircle      className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />;
  return                             <Clock        className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />;
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function IntegrationHub() {
  const [activeJobTab, setActiveJobTab]                            = useState<JobStatus>("running");
  const [testingProvider, setTestingProvider]                      = useState<string | null>(null);
  const [testResults, setTestResults]                              = useState<Record<string, ConnectionTestResult>>({});

  const handleTest = useCallback(async (name: string) => {
    setTestingProvider(name);
    try {
      const result = await aiService.testConnection();
      setTestResults(prev => ({ ...prev, [name]: result }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [name]: {
          success:   false,
          model:     "—",
          latencyMs: 0,
          timestamp: new Date().toISOString(),
          status:    "Error",
          error:     String(err?.message ?? "Connection failed"),
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Plug className="h-4 w-4 text-primary/60" />
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Intelligence Platform</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif luxury-gradient-text tracking-tight">
            Integration Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Central manager for all live API connections and data pipelines
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {OVERVIEW.connected} Connected
        </div>
      </div>

      {/* ── SECTION 1: Overview Dashboard ── */}
      <div className="luxury-card p-6 border-primary/20 bg-gradient-to-br from-primary/6 via-primary/2 to-transparent">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Overview Dashboard</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg border border-emerald-400/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Connected</p>
            <p className="text-3xl font-bold font-serif text-emerald-400">{OVERVIEW.connected}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">services live</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Disconnected</p>
            <p className="text-3xl font-bold font-serif text-foreground">{OVERVIEW.disconnected}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">awaiting config</p>
          </div>
          <div className="p-4 rounded-lg border border-amber-400/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">API Health</p>
            <p className="text-3xl font-bold font-serif text-amber-400">{OVERVIEW.apiHealth}%</p>
            <HealthBar value={OVERVIEW.apiHealth} />
          </div>
          <div className="p-4 rounded-lg border border-chart-2/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Last Sync</p>
            <p className="text-base font-bold font-mono text-chart-2">{OVERVIEW.lastSync}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">Gemini refresh</p>
          </div>
          <div className="p-4 rounded-lg border border-primary/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Active Jobs</p>
            <p className="text-3xl font-bold font-serif luxury-gradient-text">{OVERVIEW.activeJobs}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">in progress</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: AI Providers ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Providers</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {AI_PROVIDERS.filter(p => p.status === "Connected").length}/{AI_PROVIDERS.length} Connected
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {AI_PROVIDERS.map(provider => (
            <div
              key={provider.name}
              className={`p-5 rounded-xl border transition-all ${
                provider.status === "Connected"
                  ? "border-emerald-400/20 bg-emerald-400/3"
                  : "border-border bg-black/10"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${provider.status === "Connected" ? "bg-emerald-400/10" : "bg-muted/20"}`}>
                    <provider.icon className={`h-5 w-5 ${provider.status === "Connected" ? "text-emerald-400" : "text-muted-foreground/50"}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-serif text-foreground">{provider.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{provider.model}</p>
                  </div>
                </div>
                <ConnBadge status={provider.status} />
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg border border-border bg-black/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">API Key</p>
                  <div className="flex items-center gap-2">
                    {provider.keyConfigured
                      ? <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                      : <Lock   className="h-3.5 w-3.5 text-red-400/70" />}
                    <span className={`text-xs font-mono ${provider.keyConfigured ? "text-emerald-400" : "text-red-400/70"}`}>
                      {provider.keyConfigured ? "Configured" : "Not set"}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/40 mt-0.5 font-mono">{provider.keyName}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-black/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Health</p>
                  <p className={`text-xl font-bold font-mono ${provider.health > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {provider.health > 0 ? `${provider.health}%` : "—"}
                  </p>
                  <HealthBar value={provider.health} />
                </div>
                <div className="p-3 rounded-lg border border-border bg-black/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last Request</p>
                  <p className="text-xs font-mono text-foreground">{provider.lastRequest}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-black/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last Response</p>
                  <p className={`text-xs font-mono ${provider.lastResponse.startsWith("200") ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {provider.lastResponse}
                  </p>
                </div>
              </div>

              {/* Test button */}
              <button
                onClick={() => handleTest(provider.name)}
                disabled={!provider.keyConfigured || testingProvider === provider.name}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold uppercase tracking-widest transition-all min-h-[44px] ${
                  provider.keyConfigured
                    ? "border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 text-primary disabled:opacity-50"
                    : "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {testingProvider === provider.name
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Testing…</>
                  : <><Zap className="h-3.5 w-3.5" /> Test Connection</>}
              </button>

              {/* Live Test Result */}
              {testResults[provider.name] && (() => {
                const r = testResults[provider.name]!;
                return (
                  <div className={`mt-3 p-3 rounded-lg border text-xs ${r.success ? "border-emerald-400/20 bg-emerald-400/3" : "border-red-400/20 bg-red-400/3"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {r.success
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        : <XCircle      className="h-3.5 w-3.5 text-red-400" />}
                      <span className={`text-[10px] font-mono uppercase tracking-widest font-semibold ${r.success ? "text-emerald-400" : "text-red-400"}`}>
                        {r.status}
                      </span>
                      <span className="ml-auto text-[9px] font-mono text-muted-foreground/50">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    {r.success ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Model</p>
                          <p className="font-mono text-foreground truncate">{r.model}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Latency</p>
                          <p className="font-mono text-emerald-400">{r.latencyMs}ms</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-400/80 leading-relaxed">{r.error}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: Research Providers ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Research Providers</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {RESEARCH_PROVIDERS.filter(p => p.status === "Connected").length}/{RESEARCH_PROVIDERS.length} Connected
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESEARCH_PROVIDERS.map(provider => (
            <div key={provider.name} className="p-4 rounded-lg border border-border hover:border-primary/20 transition-all bg-black/10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/20">
                    <provider.icon className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{provider.name}</p>
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-mono">{provider.category}</p>
                  </div>
                </div>
                <ConnBadge status={provider.status} />
              </div>
              <div className="flex items-center justify-between text-[10px] mb-3">
                <span className="text-muted-foreground">Sync Status</span>
                <span className="font-mono text-muted-foreground/60">{provider.syncStatus}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] mb-4">
                <span className="text-muted-foreground">Last Sync</span>
                <span className="font-mono text-muted-foreground/60">{provider.lastSync}</span>
              </div>
              <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary min-h-[40px]">
                <Settings className="h-3 w-3" /> Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: Social Providers ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Radio className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Social Providers</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Official integrations only</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOCIAL_PROVIDERS.map(provider => (
            <div key={provider.name} className="p-4 rounded-lg border border-border hover:border-primary/20 transition-all bg-black/10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-muted/20">
                  <provider.icon className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <ConnBadge status={provider.status} />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{provider.name}</p>
              <p className="text-[10px] text-muted-foreground/50 mb-4 leading-relaxed">{provider.note}</p>
              <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary min-h-[40px]">
                <Settings className="h-3 w-3" /> Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: Background Jobs ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Background Jobs</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Running",   value: BG_JOBS.running.length,   color: "text-primary"     },
            { label: "Waiting",   value: BG_JOBS.waiting.length,   color: "text-amber-400"   },
            { label: "Completed", value: BG_JOBS.completed.length, color: "text-emerald-400" },
            { label: "Failed",    value: BG_JOBS.failed.length,    color: "text-red-400"     },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg border border-border bg-black/20 text-center">
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-lg border border-border w-fit">
          {(["running", "waiting", "completed", "failed"] as JobStatus[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveJobTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest transition-all ${activeJobTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {BG_JOBS[activeJobTab].map((job, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                activeJobTab === "failed"   ? "border-red-400/20 bg-red-400/3"   :
                activeJobTab === "running"  ? "border-primary/20 bg-primary/3"   :
                "border-border hover:border-primary/15"
              }`}
            >
              <JobIcon status={activeJobTab} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{job.job}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{job.detail}</p>
              </div>
              <span className={`text-[10px] font-mono flex-shrink-0 ${activeJobTab === "failed" ? "text-red-400/70" : activeJobTab === "running" ? "text-primary/70" : "text-muted-foreground/50"}`}>
                {job.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 6: Integration Logs ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Integration Logs</h2>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
        {/* Header */}
        <div className="hidden md:grid grid-cols-[80px_100px_140px_80px_1fr] gap-3 px-3 mb-2">
          {["Time", "Service", "Action", "Status", "Detail"].map(h => (
            <p key={h} className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{h}</p>
          ))}
        </div>
        <div className="space-y-1.5">
          {INTEGRATION_LOGS.map((log, i) => (
            <div
              key={i}
              className={`grid grid-cols-1 md:grid-cols-[80px_100px_140px_80px_1fr] gap-2 md:gap-3 items-center p-3 rounded-lg border transition-all ${
                log.status === "error" ? "border-red-400/15 bg-red-400/3" : "border-border hover:border-primary/15"
              }`}
            >
              <span className="text-[10px] font-mono text-muted-foreground/60">{log.ts}</span>
              <span className="text-xs font-semibold text-foreground">{log.service}</span>
              <span className="text-xs text-muted-foreground">{log.action}</span>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${LOG_DOTS[log.status]}`} />
                <span className={`text-[10px] font-mono ${LOG_COLORS[log.status]}`}>
                  {log.status === "success" ? "OK" : log.status.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">{log.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: Secrets Status ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Secrets Status</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Configuration status only — no values are displayed or stored here.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {SECRETS.map(secret => (
            <div
              key={secret.name}
              className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${
                secret.configured
                  ? "border-emerald-400/20 bg-emerald-400/3"
                  : secret.required
                  ? "border-red-400/20 bg-red-400/3"
                  : "border-border/50 bg-black/10"
              }`}
            >
              {secret.configured
                ? <Unlock className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                : <Lock   className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-semibold text-foreground truncate">{secret.name}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">{secret.description}</p>
              </div>
              <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border flex-shrink-0 ${
                secret.configured
                  ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
                  : "bg-muted/20 text-muted-foreground/50 border-border/40"
              }`}>
                {secret.configured ? "Set" : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 8: System Health ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">System Health</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall score */}
          <div className="p-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 to-transparent flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall Integration Health</p>
            <p className="text-4xl font-bold font-serif luxury-gradient-text">
              {Math.round(SYSTEM_HEALTH_MODULES.reduce((a, m) => a + m.health, 0) / SYSTEM_HEALTH_MODULES.length)}%
            </p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(SYSTEM_HEALTH_MODULES.reduce((a, m) => a + m.health, 0) / SYSTEM_HEALTH_MODULES.length)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Partial integration — AI Layer online. Research, Social, and additional providers available once API keys are configured.
            </p>
          </div>

          {/* Module health */}
          <div className="lg:col-span-2 space-y-3">
            {SYSTEM_HEALTH_MODULES.map(mod => (
              <div key={mod.name} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/15 transition-all">
                <ConnIcon status={mod.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{mod.name}</p>
                    <span className="text-xs font-mono text-muted-foreground flex-shrink-0 ml-2">
                      {mod.health > 0 ? `${mod.health}%` : "—"}
                    </span>
                  </div>
                  <HealthBar value={mod.health} />
                </div>
                <ConnBadge status={mod.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
