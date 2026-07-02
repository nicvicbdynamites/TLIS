import {
  BrainCircuit, Cpu, Zap, CheckCircle2, RefreshCw,
  AlertTriangle, Clock, TrendingUp, Users, Target,
  Sparkles, Star, Film, MessageSquare, BarChart2,
  Activity, ArrowDown, ChevronRight, Bot, Search,
  Database, Crown, Radio, Download, Settings,
  RotateCcw, Circle, Play, Unlock, BarChart3,
  Hash, Lightbulb, LineChart,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

// ── Types ─────────────────────────────────────────────────────────────────

type NodeStatus = "Active" | "Processing" | "Idle" | "Warning";
type JobStatus  = "pending" | "running" | "completed" | "failed";

// ── Engine Status ─────────────────────────────────────────────────────────

const ENGINE_STATUS = {
  status:           "Online",
  activeModels:     3,
  confidenceScore:  94,
  requestsProcessed:"28,402",
  lastUpdate:       "2 min ago",
};

// ── Reasoning Pipeline ────────────────────────────────────────────────────

interface ReasoningNode {
  name:       string;
  icon:       React.ElementType;
  status:     NodeStatus;
  confidence: number;
  processingTime: string;
  description: string;
}

const REASONING_NODES: ReasoningNode[] = [
  { name: "Research Command",      icon: Radio,        status: "Active",     confidence: 94, processingTime: "0.3s",  description: "Ingests raw trend signals and keyword data from all sources"  },
  { name: "Keyword Analysis",      icon: Search,       status: "Active",     confidence: 91, processingTime: "0.8s",  description: "Clusters and ranks keywords by opportunity and volume score"   },
  { name: "Competitor Analysis",   icon: Users,        status: "Processing", confidence: 87, processingTime: "1.4s",  description: "Analyses competitor movements and identifies content gaps"      },
  { name: "Audience Analysis",     icon: Target,       status: "Active",     confidence: 89, processingTime: "0.6s",  description: "Profiles audience behaviour, interests, and peak engagement"   },
  { name: "Trend Scoring",         icon: TrendingUp,   status: "Active",     confidence: 93, processingTime: "0.4s",  description: "Scores each trend by velocity, saturation, and fit"           },
  { name: "Content Recommendation",icon: Sparkles,     status: "Active",     confidence: 92, processingTime: "1.1s",  description: "Generates ranked content strategies for each scored trend"     },
  { name: "Executive Brief",       icon: Crown,        status: "Active",     confidence: 95, processingTime: "0.2s",  description: "Packages all intelligence into the creator's daily brief"      },
];

// ── Intelligence Modules ──────────────────────────────────────────────────

interface IntelModule {
  name:       string;
  icon:       React.ElementType;
  health:     number;
  confidence: number;
  lastActive: string;
  status:     NodeStatus;
  requests:   string;
}

const INTEL_MODULES: IntelModule[] = [
  { name: "Trend Analyzer",      icon: TrendingUp,   health: 98, confidence: 94, lastActive: "2 min ago",  status: "Active",     requests: "1,240" },
  { name: "Audience Analyzer",   icon: Users,        health: 91, confidence: 89, lastActive: "5 min ago",  status: "Active",     requests: "840"   },
  { name: "Competitor Analyzer", icon: Target,       health: 85, confidence: 87, lastActive: "12 min ago", status: "Processing", requests: "318"   },
  { name: "Content Scorer",      icon: Star,         health: 93, confidence: 91, lastActive: "3 min ago",  status: "Active",     requests: "2,104" },
  { name: "Hook Optimizer",      icon: Zap,          health: 97, confidence: 93, lastActive: "1 min ago",  status: "Active",     requests: "4,872" },
  { name: "Prompt Optimizer",    icon: Film,         health: 99, confidence: 96, lastActive: "4 min ago",  status: "Active",     requests: "9,440" },
  { name: "Caption Optimizer",   icon: MessageSquare,health: 88, confidence: 86, lastActive: "8 min ago",  status: "Idle",       requests: "187"   },
  { name: "Forecast Engine",     icon: LineChart,    health: 82, confidence: 83, lastActive: "18 min ago", status: "Processing", requests: "64"    },
];

// ── AI Recommendations ────────────────────────────────────────────────────

const AI_RECOMMENDATIONS = [
  { label: "Highest Priority",      icon: Zap,          value: "Publish 60s Quiet Luxury hook today — 72-hour window", color: "text-primary",     border: "border-primary/25",     bg: "bg-primary/5"     },
  { label: "Fastest Growing Niche", icon: TrendingUp,   value: "Quiet Luxury Skincare — +340% this week",             color: "text-emerald-400", border: "border-emerald-400/25", bg: "bg-emerald-400/5" },
  { label: "Suggested Posting Time",icon: Clock,        value: "Saturday 11:00 AM — Peak engagement window",          color: "text-chart-2",     border: "border-chart-2/25",     bg: "bg-chart-2/5"     },
  { label: "Suggested Content Type",icon: Sparkles,     value: "Get Ready With Me (GRWM) — 34% of top performers",    color: "text-amber-400",   border: "border-amber-400/25",   bg: "bg-amber-400/5"   },
  { label: "Suggested Platform",    icon: Play,         value: "TikTok primary, Instagram Reels cross-post",           color: "text-chart-5",     border: "border-chart-5/25",     bg: "bg-chart-5/5"     },
];

// ── Confidence Dashboard ──────────────────────────────────────────────────

const CONFIDENCE_METRICS = [
  { label: "Research",            value: 94, color: "bg-primary"     },
  { label: "Competitor Analysis", value: 87, color: "bg-chart-2"     },
  { label: "Trend Detection",     value: 93, color: "bg-emerald-400" },
  { label: "Prompt Quality",      value: 96, color: "bg-amber-400"   },
  { label: "Forecast Accuracy",   value: 83, color: "bg-chart-5"     },
];

// ── Processing Queue ──────────────────────────────────────────────────────

const PROCESSING_TASKS: Record<JobStatus, { task: string; detail: string; time: string }[]> = {
  pending: [
    { task: "Keyword cluster re-analysis",   detail: "Triggered by Research Command",    time: "Est. 2 min" },
    { task: "Competitor post scoring",        detail: "3 new competitor posts detected",  time: "Est. 4 min" },
    { task: "Caption quality optimisation",  detail: "Queue: 12 captions pending",       time: "Est. 6 min" },
  ],
  running: [
    { task: "Trend velocity scoring",        detail: "14 trends being scored",           time: "1.4s elapsed" },
    { task: "Executive Brief compilation",   detail: "All modules reporting",             time: "0.8s elapsed" },
  ],
  completed: [
    { task: "Hook pattern extraction",       detail: "42 hooks scored and ranked",       time: "2 min ago"  },
    { task: "Audience profile refresh",      detail: "Behaviour model updated",          time: "5 min ago"  },
    { task: "Prompt vault indexing",         detail: "9,440 prompts re-indexed",         time: "12 min ago" },
    { task: "Niche opportunity scoring",     detail: "8 niches scored this cycle",       time: "18 min ago" },
  ],
  failed: [
    { task: "Reddit signal ingestion",       detail: "Rate limit exceeded — retry in 58 min", time: "1h ago" },
  ],
};

// ── Future AI Providers ───────────────────────────────────────────────────

const AI_PROVIDERS = [
  { name: "Gemini",   icon: BrainCircuit, desc: "Google's multimodal AI for research and content generation"   },
  { name: "OpenAI",   icon: Bot,          desc: "GPT-4 and GPT-o models for prompt and caption optimisation"  },
  { name: "Claude",   icon: Sparkles,     desc: "Anthropic Claude for long-form reasoning and analysis"       },
  { name: "DeepSeek", icon: Search,       desc: "DeepSeek R1 for cost-efficient intelligence processing"      },
  { name: "Grok",     icon: Zap,          desc: "xAI Grok for real-time trend and social media intelligence"  },
  { name: "Mistral",  icon: Lightbulb,    desc: "Mistral AI for fast, lightweight content recommendation"     },
];

const REFRESH_OPTIONS = ["Every 5 minutes", "Every 10 minutes", "Every 30 minutes", "Every hour"];

// ── Sub-components ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === "Active")     return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "Processing") return <RefreshCw    className="h-3.5 w-3.5 text-primary animate-spin" />;
  if (status === "Idle")       return <Circle       className="h-3.5 w-3.5 text-muted-foreground/40" />;
  return                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
}

function StatusBadge({ status }: { status: NodeStatus }) {
  const s: Record<NodeStatus, string> = {
    Active:     "bg-emerald-400/10 text-emerald-400 border-emerald-400/25",
    Processing: "bg-primary/10 text-primary border-primary/25",
    Idle:       "bg-muted/20 text-muted-foreground border-border",
    Warning:    "bg-amber-400/10 text-amber-400 border-amber-400/25",
  };
  return <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${s[status]}`}>{status}</span>;
}

function ConfBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  const auto = value >= 90 ? "bg-emerald-400" : value >= 75 ? "bg-amber-400" : "bg-red-400";
  const fill  = color === "bg-primary" ? auto : color;
  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${fill} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full border transition-all duration-300 flex-shrink-0 ${active ? "bg-primary/20 border-primary/50" : "bg-muted/20 border-border"}`}
      aria-pressed={active}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 ${active ? "left-[22px] bg-primary" : "left-0.5 bg-muted-foreground/30"}`} />
    </button>
  );
}

function JobStatusIcon({ status }: { status: JobStatus }) {
  if (status === "running")   return <RefreshCw    className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />;
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />;
  if (status === "failed")    return <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />;
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AIIntelligenceEngine() {
  const [, navigate] = useLocation();

  const [selectedNode, setSelectedNode]   = useState<number>(0);
  const [autoAnalysis, setAutoAnalysis]   = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(REFRESH_OPTIONS[0]!);
  const [activeQueueTab, setActiveQueueTab]   = useState<JobStatus>("running");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const node = REASONING_NODES[selectedNode]!;

  const handleManualAnalysis = useCallback(() => {
    setAnalysisLoading(true);
    setTimeout(() => setAnalysisLoading(false), 2000);
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="h-4 w-4 text-primary/60" />
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Intelligence Platform</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif luxury-gradient-text tracking-tight">
            AI Intelligence Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Central AI reasoning layer powering all TLIS intelligence modules
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Engine Status ── */}
      <div className="luxury-card p-6 border-primary/25 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Engine Status</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Live · Auto-refresh</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg border border-emerald-400/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">AI Engine Status</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-base font-bold font-mono text-emerald-400">{ENGINE_STATUS.status}</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-primary/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Active Models</p>
            <p className="text-2xl font-bold font-serif luxury-gradient-text">{ENGINE_STATUS.activeModels}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">of 6 configured</p>
          </div>
          <div className="p-4 rounded-lg border border-chart-2/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Confidence Score</p>
            <p className="text-2xl font-bold font-serif text-chart-2">{ENGINE_STATUS.confidenceScore}%</p>
            <ConfBar value={ENGINE_STATUS.confidenceScore} color="bg-chart-2" />
          </div>
          <div className="p-4 rounded-lg border border-amber-400/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Requests Processed</p>
            <p className="text-2xl font-bold font-serif text-amber-400">{ENGINE_STATUS.requestsProcessed}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">total lifetime</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Last Update</p>
            <p className="text-base font-bold font-mono text-foreground">{ENGINE_STATUS.lastUpdate}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">intelligence refresh</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Reasoning Pipeline ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Reasoning Pipeline</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {REASONING_NODES.filter(n => n.status === "Active").length} Active ·{" "}
            {REASONING_NODES.filter(n => n.status === "Processing").length} Processing
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Flow */}
          <div className="lg:col-span-2 space-y-0">
            {REASONING_NODES.map((n, i) => {
              const isSelected = selectedNode === i;
              const isLast     = i === REASONING_NODES.length - 1;
              return (
                <div key={n.name}>
                  <button
                    onClick={() => setSelectedNode(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 ${isSelected ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/10"}`}
                  >
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${isSelected ? "bg-primary/20" : "bg-muted/20"}`}>
                      <n.icon className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{n.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusIcon status={n.status} />
                        <span className="text-[10px] text-muted-foreground font-mono">{n.processingTime}</span>
                      </div>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
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
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <node.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-foreground">{node.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{node.description}</p>
                </div>
              </div>
              <StatusBadge status={node.status} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-black/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusIcon status={node.status} />
                  <span className="text-sm font-medium text-foreground">{node.status}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-black/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Confidence</p>
                <p className="text-xl font-bold font-mono text-foreground mb-1.5">{node.confidence}%</p>
                <ConfBar value={node.confidence} />
              </div>
              <div className="p-3 rounded-lg border border-border bg-black/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Proc. Time</p>
                <p className="text-xl font-bold font-mono text-primary">{node.processingTime}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 transition-all text-xs font-semibold text-primary uppercase tracking-widest min-h-[44px]"
            >
              View Module <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Intelligence Modules ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Cpu className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Intelligence Modules</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {INTEL_MODULES.filter(m => m.status === "Active").length}/{INTEL_MODULES.length} Active
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INTEL_MODULES.map(mod => (
            <div
              key={mod.name}
              className={`p-4 rounded-lg border transition-all hover:border-primary/25 hover:bg-primary/3 ${mod.status === "Active" ? "border-border" : mod.status === "Idle" ? "border-border/40 opacity-70" : "border-border"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <mod.icon className="h-4 w-4 text-primary" />
                </div>
                <StatusBadge status={mod.status} />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{mod.name}</p>
              <p className="text-[10px] text-muted-foreground/60 font-mono mb-3">{mod.requests} requests</p>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Health</span>
                    <span className="font-mono text-foreground">{mod.health}%</span>
                  </div>
                  <ConfBar value={mod.health} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-mono text-primary">{mod.confidence}%</span>
                  </div>
                  <ConfBar value={mod.confidence} color="bg-primary" />
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                <Activity className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/50 font-mono">{mod.lastActive}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: AI Recommendations ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Recommendations</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">AI Generated · Live</span>
        </div>
        <div className="space-y-3">
          {AI_RECOMMENDATIONS.map((rec, i) => (
            <div key={i} className={`flex items-start gap-4 p-4 rounded-lg border ${rec.border} ${rec.bg}`}>
              <div className="p-2 rounded-lg bg-black/30 flex-shrink-0">
                <rec.icon className={`h-4 w-4 ${rec.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${rec.color} mb-0.5`}>{rec.label}</p>
                <p className="text-sm text-foreground leading-relaxed">{rec.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: Confidence Dashboard ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Confidence Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bars */}
          <div className="space-y-4">
            {CONFIDENCE_METRICS.map(metric => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-foreground">{metric.label}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${metric.color} rounded-full`} style={{ width: `${metric.value}%` }} />
                    </div>
                    <span className={`text-sm font-bold font-mono w-10 text-right`} style={{ color: undefined }}>
                      <span className={metric.color.replace("bg-", "text-")}>{metric.value}%</span>
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${metric.color} rounded-full transition-all duration-700`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Summary card */}
          <div className="p-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 to-transparent flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Average Confidence</p>
              <p className="text-4xl font-bold font-serif luxury-gradient-text">
                {Math.round(CONFIDENCE_METRICS.reduce((a, m) => a + m.value, 0) / CONFIDENCE_METRICS.length)}%
              </p>
            </div>
            <ConfBar value={Math.round(CONFIDENCE_METRICS.reduce((a, m) => a + m.value, 0) / CONFIDENCE_METRICS.length)} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI confidence is strong across all modules. Competitor Analysis and Forecast Accuracy are the lowest-scoring dimensions — live API connections will improve both.
            </p>
            <div className="mt-auto">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Trend</p>
              <p className="text-sm font-semibold text-emerald-400">↑ +4 pts vs last week</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Processing Queue ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Processing Queue</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Pending",   value: PROCESSING_TASKS.pending.length,   color: "text-primary"     },
            { label: "Running",   value: PROCESSING_TASKS.running.length,   color: "text-amber-400"   },
            { label: "Completed", value: PROCESSING_TASKS.completed.length, color: "text-emerald-400" },
            { label: "Failed",    value: PROCESSING_TASKS.failed.length,    color: "text-red-400"     },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg border border-border bg-black/20 text-center">
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-lg border border-border w-fit">
          {(["pending", "running", "completed", "failed"] as JobStatus[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveQueueTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest transition-all ${activeQueueTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {PROCESSING_TASKS[activeQueueTab].map((job, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                activeQueueTab === "failed"
                  ? "border-red-400/20 bg-red-400/3"
                  : activeQueueTab === "running"
                  ? "border-primary/20 bg-primary/3"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <JobStatusIcon status={activeQueueTab} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{job.task}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{job.detail}</p>
              </div>
              <span className={`text-[10px] font-mono flex-shrink-0 ${activeQueueTab === "failed" ? "text-red-400/70" : activeQueueTab === "running" ? "text-primary/70" : "text-muted-foreground/50"}`}>
                {job.time}
              </span>
            </div>
          ))}
          {PROCESSING_TASKS[activeQueueTab].length === 0 && (
            <p className="text-center text-sm text-muted-foreground/50 py-6">No {activeQueueTab} tasks</p>
          )}
        </div>
      </div>

      {/* ── SECTION 7: Future AI Providers ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Unlock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Future AI Providers</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Connect any of these providers to activate live AI reasoning across all modules.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_PROVIDERS.map(provider => (
            <div
              key={provider.name}
              className="p-4 rounded-lg border border-primary/15 bg-primary/3 hover:border-primary/30 hover:bg-primary/8 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <provider.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/5 text-emerald-400">
                  Ready
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{provider.name}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{provider.desc}</p>
              <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all text-[10px] font-semibold uppercase tracking-widest text-primary min-h-[36px]">
                Connect <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 8: Engine Settings ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Engine Settings</h2>
        </div>
        <div className="space-y-5">

          {/* Auto Analysis */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Auto Analysis</p>
              <p className="text-xs text-muted-foreground mt-0.5">Continuously analyse intelligence on the refresh interval</p>
            </div>
            <Toggle active={autoAnalysis} onChange={() => setAutoAnalysis(p => !p)} />
          </div>

          {/* Refresh Interval */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Refresh Interval</p>
              <p className="text-xs text-muted-foreground mt-0.5">How often the AI engine re-processes all intelligence signals</p>
            </div>
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(e.target.value)}
              className="bg-black/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all w-full sm:w-auto"
            >
              {REFRESH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Manual Analysis */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Manual Analysis</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trigger a full AI re-analysis of all intelligence immediately</p>
            </div>
            <button
              onClick={handleManualAnalysis}
              disabled={analysisLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 transition-all text-sm font-semibold text-primary disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
            >
              <RotateCcw className={`h-4 w-4 ${analysisLoading ? "animate-spin" : ""}`} />
              {analysisLoading ? "Analysing…" : "Run Analysis"}
            </button>
          </div>

          {/* Export Intelligence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Export Intelligence</p>
              <p className="text-xs text-muted-foreground mt-0.5">Export all AI analysis results and confidence metrics</p>
            </div>
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm font-semibold text-foreground min-h-[44px] w-full sm:w-auto">
              <Download className="h-4 w-4 text-muted-foreground" />
              Export Intelligence
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
