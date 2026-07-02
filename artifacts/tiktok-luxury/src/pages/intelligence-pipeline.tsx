import {
  Layers, ArrowDown, CheckCircle2, RefreshCw, MinusCircle,
  AlertTriangle, Search, Users, Zap, Film, Sparkles,
  Database, CalendarDays, BarChart3, Crown, Hash, Target,
  TrendingUp, Play, MessageSquare, BrainCircuit, Bot,
  Globe, Settings, Download, Clock, Activity, BarChart2,
  Lock, ChevronRight, AlertCircle, XCircle, Radio,
  RotateCcw, ClipboardList,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

// ── Types ────────────────────────────────────────────────────────────────

type NodeStatus   = "Active" | "Processing" | "Idle" | "Warning";
type LogStatus    = "Success" | "Failed" | "Processing";
type JobPriority  = "HIGH" | "MEDIUM" | "LOW";

// ── Pipeline Node Data ───────────────────────────────────────────────────

interface PipelineNode {
  name:        string;
  href:        string;
  status:      NodeStatus;
  health:      number;
  confidence:  number;
  records:     string;
  icon:        React.ElementType;
  description: string;
}

const PIPELINE_NODES: PipelineNode[] = [
  { name: "Research Command Center", href: "/research",    status: "Active",     health: 98,  confidence: 94, records: "1,240",  icon: Radio,        description: "Monitors 8 trend sources and feeds keyword intelligence downstream." },
  { name: "Keyword Discovery",       href: "/research",    status: "Active",     health: 95,  confidence: 91, records: "842",    icon: Search,       description: "Extracts, ranks, and clusters keywords for content opportunity scoring." },
  { name: "Competitor Tracking",     href: "/competitors", status: "Processing", health: 88,  confidence: 87, records: "318",    icon: Users,        description: "Monitors competitor post frequency, follower changes, and niche movements." },
  { name: "Viral Hooks",             href: "/hooks",       status: "Active",     health: 97,  confidence: 93, records: "2,104",  icon: Zap,          description: "Generates and stores viral hook patterns from top-performing content." },
  { name: "Prompt Vault",            href: "/prompts",     status: "Active",     health: 99,  confidence: 96, records: "4,872",  icon: Film,         description: "Stores and surfaces optimised AI prompts for content creation workflows." },
  { name: "AI Content Generator",    href: "/generator",   status: "Idle",       health: 92,  confidence: 89, records: "187",    icon: Sparkles,     description: "Generates content drafts from vault prompts on-demand or via automation." },
  { name: "Intelligence Vault",      href: "/vault",       status: "Active",     health: 100, confidence: 97, records: "9,440",  icon: Database,     description: "Central storage for all intelligence, prompts, hooks, and content assets." },
  { name: "Content Calendar",        href: "/calendar",    status: "Active",     health: 94,  confidence: 92, records: "64",     icon: CalendarDays, description: "Schedules and manages the content publishing queue with AI timing." },
  { name: "Analytics Intelligence",  href: "/analytics",   status: "Processing", health: 85,  confidence: 83, records: "28,300", icon: BarChart3,    description: "Analyses post performance and feeds learnings upstream for model tuning." },
  { name: "Executive Brief",         href: "/brief",       status: "Active",     health: 97,  confidence: 95, records: "—",      icon: Crown,        description: "Final destination: surfaces all pipeline intelligence to the creator." },
];

// ── Data Sources ─────────────────────────────────────────────────────────

const DATA_SOURCES = [
  { name: "Research Command Center", records: "1,240 keywords",    freshness: "5 min",     confidence: 94, icon: Radio        },
  { name: "Competitors",             records: "318 events",        freshness: "12 min",    confidence: 87, icon: Users        },
  { name: "Analytics Intelligence",  records: "28,300 data pts",   freshness: "1 hour",    confidence: 83, icon: BarChart3    },
  { name: "Content Calendar",        records: "64 scheduled",      freshness: "Real-time", confidence: 92, icon: CalendarDays },
  { name: "Intelligence Vault",      records: "9,440 assets",      freshness: "1 min",     confidence: 97, icon: Database     },
  { name: "Usage Tracker",           records: "14 sessions",       freshness: "Live",      confidence: 99, icon: Activity     },
];

// ── Processing Queue ─────────────────────────────────────────────────────

const PENDING_JOBS: { job: string; eta: string; priority: JobPriority }[] = [
  { job: "Keyword cluster analysis",      eta: "2 min",  priority: "HIGH"   },
  { job: "Competitor post scan",          eta: "5 min",  priority: "MEDIUM" },
  { job: "Analytics trend extraction",    eta: "8 min",  priority: "MEDIUM" },
  { job: "Prompt vault re-indexing",      eta: "11 min", priority: "LOW"    },
];

const COMPLETED_JOBS = [
  { job: "Executive Brief generation",    duration: "0.8s",  ts: "2 min ago"  },
  { job: "Viral hook scoring",            duration: "1.2s",  ts: "5 min ago"  },
  { job: "Prompt vault indexing",         duration: "3.4s",  ts: "12 min ago" },
  { job: "Content calendar sync",         duration: "0.3s",  ts: "18 min ago" },
  { job: "Competitor follower delta",     duration: "2.1s",  ts: "32 min ago" },
];

const FAILED_JOBS = [
  { job: "Reddit API fetch",    reason: "Rate limit exceeded", ts: "1h ago"  },
  { job: "Ahrefs keyword pull", reason: "Integration pending", ts: "3h ago"  },
];

// ── Intelligence Health ──────────────────────────────────────────────────

const MODULE_HEALTH: { name: string; health: number; status: NodeStatus }[] = [
  { name: "Research Engine",    health: 98,  status: "Active"     },
  { name: "AI Processing",      health: 91,  status: "Active"     },
  { name: "Data Storage",       health: 100, status: "Active"     },
  { name: "Competitor Tracker", health: 85,  status: "Warning"    },
  { name: "Analytics Engine",   health: 82,  status: "Warning"    },
  { name: "Content Scheduler",  health: 94,  status: "Active"     },
];

// ── Pipeline Logs ────────────────────────────────────────────────────────

const PIPELINE_LOGS: { ts: string; source: string; dest: string; status: LogStatus; event: string }[] = [
  { ts: "09:58 PM", source: "Research",    dest: "Keywords",    status: "Success",    event: "127 new keywords extracted and ranked" },
  { ts: "09:55 PM", source: "Competitors", dest: "Brief",       status: "Success",    event: "Competitor alert processed and surfaced" },
  { ts: "09:47 PM", source: "Analytics",   dest: "Hooks",       status: "Success",    event: "Top 3 hook patterns reinforced from data" },
  { ts: "09:44 PM", source: "Calendar",    dest: "Vault",       status: "Success",    event: "Post metadata archived to Intelligence Vault" },
  { ts: "09:31 PM", source: "Research",    dest: "Reddit API",  status: "Failed",     event: "Rate limit hit — retry in 60 minutes" },
  { ts: "09:20 PM", source: "Generator",   dest: "Calendar",    status: "Success",    event: "3 content drafts sent to publishing queue" },
  { ts: "09:12 PM", source: "Analytics",   dest: "Research",    status: "Processing", event: "Performance signals feeding trend model" },
  { ts: "08:55 PM", source: "Vault",       dest: "Brief",       status: "Success",    event: "Morning intelligence package compiled" },
];

// ── Automation Triggers ──────────────────────────────────────────────────

const AUTOMATION_TRIGGERS = [
  { label: "New keyword discovered", icon: Search,      lastFired: "5 min ago",  active: true  },
  { label: "Competitor spike",       icon: Users,       lastFired: "2h ago",     active: true  },
  { label: "High engagement",        icon: TrendingUp,  lastFired: "4h ago",     active: true  },
  { label: "Trending hashtag",       icon: Hash,        lastFired: "12 min ago", active: true  },
  { label: "New niche detected",     icon: Target,      lastFired: "3d ago",     active: false },
  { label: "Content scheduled",      icon: CalendarDays,lastFired: "1h ago",     active: true  },
];

// ── Future Integrations ──────────────────────────────────────────────────

const FUTURE_INTEGRATIONS = [
  { name: "Supabase Realtime", icon: Database,      category: "Storage"  },
  { name: "Gemini",            icon: BrainCircuit,  category: "AI"       },
  { name: "OpenAI",            icon: Bot,           category: "AI"       },
  { name: "Google Trends",     icon: Globe,         category: "Data"     },
  { name: "Reddit",            icon: MessageSquare, category: "Social"   },
  { name: "Ahrefs",            icon: BarChart2,     category: "SEO"      },
  { name: "SEMrush",           icon: Search,        category: "SEO"      },
  { name: "TikTok Research",   icon: Play,          category: "Social"   },
];

// ── Sub-components ────────────────────────────────────────────────────────

function NodeStatusIcon({ status }: { status: NodeStatus }) {
  if (status === "Active")     return <CheckCircle2  className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "Processing") return <RefreshCw     className="h-3.5 w-3.5 text-primary animate-spin" />;
  if (status === "Idle")       return <MinusCircle   className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return                              <AlertTriangle  className="h-3.5 w-3.5 text-amber-400" />;
}

function NodeStatusBadge({ status }: { status: NodeStatus }) {
  const styles: Record<NodeStatus, string> = {
    Active:     "bg-emerald-400/10 text-emerald-400 border-emerald-400/25",
    Processing: "bg-primary/10 text-primary border-primary/25",
    Idle:       "bg-muted/20 text-muted-foreground border-border",
    Warning:    "bg-amber-400/10 text-amber-400 border-amber-400/25",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: JobPriority }) {
  const styles: Record<JobPriority, string> = {
    HIGH:   "bg-primary/15 text-primary border-primary/30",
    MEDIUM: "bg-amber-400/10 text-amber-400 border-amber-400/25",
    LOW:    "bg-muted/20 text-muted-foreground border-border",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function LogStatusIcon({ status }: { status: LogStatus }) {
  if (status === "Success")    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />;
  if (status === "Failed")     return <XCircle      className="h-3.5 w-3.5 text-red-400    flex-shrink-0" />;
  return                              <RefreshCw     className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />;
}

function HealthBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  const barColor =
    value >= 90 ? "bg-emerald-400"
    : value >= 75 ? "bg-amber-400"
    : "bg-red-400";

  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color === "bg-primary" ? barColor : color} rounded-full transition-all duration-700`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full border transition duration-300 flex-shrink-0 ${active ? "bg-primary/20 border-primary/50" : "bg-muted/20 border-border"}`}
      aria-pressed={active}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full transition duration-300 ${active ? "left-[22px] bg-primary" : "left-0.5 bg-muted-foreground/30"}`}
      />
    </button>
  );
}

// ── Overall health gauge ──────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const r     = 44;
  const circ  = 2 * Math.PI * r;
  const half  = circ / 2;
  const fill  = (score / 100) * half;
  const color = score >= 90 ? "hsl(142 71% 45%)" : score >= 75 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="112" height="64" viewBox="0 0 112 64">
          <path d="M 12 58 A 44 44 0 0 1 100 58" fill="none" stroke="hsl(44 54% 54% / 0.12)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 12 58 A 44 44 0 0 1 100 58" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${fill} ${half}`} style={{ transition: "stroke-dasharray 1s ease" }} />
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-1 text-center">
          <p className="text-xl font-bold font-serif luxury-gradient-text leading-none">{score}%</p>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall Health</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

const REFRESH_OPTIONS = ["Every 5 minutes", "Every 10 minutes", "Every 30 minutes", "Every hour"];

export default function IntelligencePipeline() {
  const [, navigate] = useLocation();

  const [selectedNode, setSelectedNode] = useState<number>(0);
  const [triggers, setTriggers]         = useState(AUTOMATION_TRIGGERS);
  const [autoSync, setAutoSync]         = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(REFRESH_OPTIONS[0]!);
  const [syncLoading, setSyncLoading]   = useState(false);
  const [activeQueueTab, setActiveQueueTab] = useState<"pending" | "completed" | "failed">("pending");

  const node = PIPELINE_NODES[selectedNode]!;

  const handleSync = useCallback(() => {
    setSyncLoading(true);
    setTimeout(() => setSyncLoading(false), 2000);
  }, []);

  const toggleTrigger = (i: number) =>
    setTriggers(prev => prev.map((t, idx) => idx === i ? { ...t, active: !t.active } : t));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-primary/60" />
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Intelligence Platform</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif luxury-gradient-text tracking-tight">
            Intelligence Pipeline
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Internal intelligence flow connecting all TLIS modules
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </div>
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition text-xs text-muted-foreground hover:text-primary disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${syncLoading ? "animate-spin text-primary" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* ── SECTION 1: Pipeline Overview ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Pipeline Overview</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {PIPELINE_NODES.filter(n => n.status === "Active").length} Active ·{" "}
            {PIPELINE_NODES.filter(n => n.status === "Processing").length} Processing ·{" "}
            {PIPELINE_NODES.filter(n => n.status === "Idle").length} Idle
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Node flow list */}
          <div className="lg:col-span-2 space-y-0">
            {PIPELINE_NODES.map((n, i) => {
              const isSelected = selectedNode === i;
              const isLast     = i === PIPELINE_NODES.length - 1;
              return (
                <div key={n.name}>
                  <button
                    onClick={() => setSelectedNode(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition duration-200 ${
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-muted/10"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${isSelected ? "bg-primary/20" : "bg-muted/20"}`}>
                      <n.icon className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {n.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <NodeStatusIcon status={n.status} />
                        <span className="text-[10px] text-muted-foreground font-mono">{n.records} records</span>
                      </div>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                  </button>
                  {!isLast && (
                    <div className="flex justify-center py-0.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="h-3 w-[1px] bg-border" />
                        <ArrowDown className="h-2.5 w-2.5 text-muted-foreground/30" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 bg-black/30 rounded-xl border border-border p-5 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                  <node.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-foreground">{node.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{node.description}</p>
                </div>
              </div>
              <NodeStatusBadge status={node.status} />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-black/40 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Health</p>
                <p className="text-xl font-bold font-mono text-foreground mb-1.5">{node.health}%</p>
                <HealthBar value={node.health} />
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Confidence</p>
                <p className="text-xl font-bold font-mono text-foreground mb-1.5">{node.confidence}%</p>
                <HealthBar value={node.confidence} color="bg-chart-2" />
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Records Processed</p>
                <p className="text-xl font-bold font-mono text-primary">{node.records}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <NodeStatusIcon status={node.status} />
                  <span className="text-sm font-medium text-foreground">{node.status}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(node.href)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 transition text-xs font-semibold text-primary uppercase tracking-widest min-h-[44px]"
            >
              Open Module <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Data Sources ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Data Sources</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Incoming Intelligence</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DATA_SOURCES.map(src => (
            <div key={src.name} className="p-4 rounded-lg border border-border hover:border-primary/25 hover:bg-primary/3 transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <src.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {src.freshness}
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{src.name}</p>
              <p className="text-xs text-muted-foreground mb-3">{src.records}</p>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-mono text-primary">{src.confidence}%</span>
              </div>
              <HealthBar value={src.confidence} />
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: Processing Queue ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Processing Queue</h2>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Pending",    value: PENDING_JOBS.length,   color: "text-primary"    },
            { label: "Completed",  value: COMPLETED_JOBS.length, color: "text-emerald-400"},
            { label: "Failed",     value: FAILED_JOBS.length,    color: "text-red-400"    },
            { label: "Avg. Time",  value: "2.1s",                color: "text-chart-2"    },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg border border-border bg-black/20 text-center">
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-lg border border-border w-fit">
          {(["pending", "completed", "failed"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveQueueTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest transition ${
                activeQueueTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-2">
          {activeQueueTab === "pending" && PENDING_JOBS.map((job, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition">
              <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />
              <p className="text-sm text-foreground flex-1">{job.job}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <Clock className="h-3 w-3" />{job.eta}
                </div>
                <PriorityBadge priority={job.priority} />
              </div>
            </div>
          ))}

          {activeQueueTab === "completed" && COMPLETED_JOBS.map((job, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-foreground flex-1">{job.job}</p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[10px] font-mono text-emerald-400">{job.duration}</span>
                <span className="text-[10px] font-mono text-muted-foreground/50">{job.ts}</span>
              </div>
            </div>
          ))}

          {activeQueueTab === "failed" && FAILED_JOBS.map((job, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-red-400/20 bg-red-400/3">
              <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{job.job}</p>
                <p className="text-[10px] text-red-400/70">{job.reason}</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0">{job.ts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: Intelligence Health ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Intelligence Health</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Gauge */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-black/20">
            <HealthGauge score={94} />
          </div>

          {/* Module health bars */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Module Health</p>
            {MODULE_HEALTH.map(mod => (
              <div key={mod.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <NodeStatusIcon status={mod.status} />
                    <span className="text-xs text-foreground">{mod.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{mod.health}%</span>
                </div>
                <HealthBar value={mod.health} />
              </div>
            ))}
          </div>

          {/* Score cards */}
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border bg-black/20">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Pipeline Confidence</p>
              <p className="text-2xl font-bold font-serif luxury-gradient-text">92%</p>
              <HealthBar value={92} />
            </div>
            <div className="p-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">AI Reliability</p>
              <p className="text-2xl font-bold font-serif text-emerald-400">94%</p>
              <HealthBar value={94} color="bg-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: Pipeline Logs ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Pipeline Logs</h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/50">Last 8 events</span>
        </div>
        {/* Header row */}
        <div className="hidden md:grid grid-cols-[80px_1fr_1fr_80px_1fr] gap-3 px-3 mb-2">
          {["Time", "Source", "Destination", "Status", "Event"].map(h => (
            <p key={h} className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{h}</p>
          ))}
        </div>
        <div className="space-y-1.5">
          {PIPELINE_LOGS.map((log, i) => (
            <div
              key={i}
              className={`grid grid-cols-1 md:grid-cols-[80px_1fr_1fr_80px_1fr] gap-2 md:gap-3 items-center p-3 rounded-lg border transition ${
                log.status === "Failed"
                  ? "border-red-400/20 bg-red-400/3"
                  : "border-border hover:border-primary/20 hover:bg-primary/2"
              }`}
            >
              <span className="text-[10px] font-mono text-muted-foreground/60">{log.ts}</span>
              <span className="text-xs text-foreground font-medium">{log.source}</span>
              <span className="text-xs text-muted-foreground">{log.dest}</span>
              <div className="flex items-center gap-1.5">
                <LogStatusIcon status={log.status} />
                <span className={`text-[10px] font-mono ${log.status === "Success" ? "text-emerald-400" : log.status === "Failed" ? "text-red-400" : "text-primary"}`}>
                  {log.status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">{log.event}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 6: Automation Triggers ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Automation Triggers</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {triggers.filter(t => t.active).length}/{triggers.length} Active
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {triggers.map((trigger, i) => (
            <div
              key={trigger.label}
              className={`p-4 rounded-lg border transition ${trigger.active ? "border-primary/25 bg-primary/5" : "border-border bg-black/10 opacity-60"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${trigger.active ? "bg-primary/15" : "bg-muted/20"}`}>
                  <trigger.icon className={`h-4 w-4 ${trigger.active ? "text-primary" : "text-muted-foreground/50"}`} />
                </div>
                <Toggle active={trigger.active} onChange={() => toggleTrigger(i)} />
              </div>
              <p className={`text-sm font-semibold mb-1 ${trigger.active ? "text-foreground" : "text-muted-foreground"}`}>
                {trigger.label}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/50">
                Last fired: {trigger.lastFired}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: Future Integrations ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-muted-foreground/60" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Future Integrations</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Pipeline integrations planned for upcoming releases.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {FUTURE_INTEGRATIONS.map(integ => (
            <div key={integ.name} className="p-3 rounded-lg border border-border/40 bg-muted/5 opacity-60 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-lg bg-muted/20">
                <integ.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium leading-snug">{integ.name}</p>
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">{integ.category}</p>
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground/40">
                Soon
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 8: Pipeline Settings ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Pipeline Settings</h2>
        </div>
        <div className="space-y-5">

          {/* Refresh Interval */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Refresh Interval</p>
              <p className="text-xs text-muted-foreground mt-0.5">How often the pipeline polls all data sources</p>
            </div>
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(e.target.value)}
              className="bg-black/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition w-full sm:w-auto"
            >
              {REFRESH_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Auto Sync */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Auto Sync</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically sync intelligence on the refresh interval</p>
            </div>
            <Toggle active={autoSync} onChange={() => setAutoSync(prev => !prev)} />
          </div>

          {/* Manual Sync */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Manual Sync</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trigger a full pipeline sync immediately</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 transition text-sm font-semibold text-primary disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
            >
              <RotateCcw className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
              {syncLoading ? "Syncing…" : "Sync Now"}
            </button>
          </div>

          {/* Export Logs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Export Logs</p>
              <p className="text-xs text-muted-foreground mt-0.5">Download all pipeline activity logs</p>
            </div>
            <button
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition text-sm font-semibold text-foreground min-h-[44px] w-full sm:w-auto"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              Export Logs
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
