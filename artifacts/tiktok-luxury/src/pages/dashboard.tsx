import {
  TrendingUp, BarChart2, ArrowRight, Clock, Activity, Zap,
  Briefcase, UserCheck2, Package, Database, CalendarDays,
  CheckCircle2, AlertCircle, Loader2, Wifi, Plus, FolderOpen,
  Inbox, Circle,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { loadUsage, formatCost, type UsageData } from "@/lib/usage";
import { useAuth } from "@/lib/auth";
import { useActiveWorkspace } from "@/lib/workspace-context";
import {
  checkSupabaseConnection,
  fetchWorkspaceStatsFromCloud,
  fetchAccountsFromCloud,
  fetchRecentActivityFromCloud,
  type WorkspaceStats,
  type ActivityEvent,
  type ActivityEventType,
} from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

// ── Utilities ─────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return "–";
  const diff  = Date.now() - new Date(iso).getTime();
  const secs  = Math.floor(diff / 1_000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (secs  <   60) return "just now";
  if (mins  <   60) return `${mins} minute${mins   === 1 ? "" : "s"} ago`;
  if (hours <   24) return `${hours} hour${hours   === 1 ? "" : "s"} ago`;
  if (days  ===  1) return "Yesterday";
  if (days  <    7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

const EVENT_COLOR: Record<ActivityEventType, string> = {
  workspace: "text-primary",
  account:   "text-chart-2",
  vault:     "text-chart-5",
  calendar:  "text-emerald-400",
  content:   "text-primary",
  ai:        "text-muted-foreground",
};

const EVENT_DOT: Record<ActivityEventType, string> = {
  workspace: "bg-primary",
  account:   "bg-chart-2",
  vault:     "bg-chart-5",
  calendar:  "bg-emerald-400",
  content:   "bg-primary",
  ai:        "bg-muted-foreground",
};

// ── Onboarding Panel ──────────────────────────────────────────────────────

interface OnboardingStep {
  label: string;
  href:  string;
  done:  boolean;
}

function OnboardingPanel({ steps }: { steps: OnboardingStep[] }) {
  const completed = steps.filter(s => s.done).length;
  const pct       = Math.round((completed / steps.length) * 100);

  return (
    <div className="luxury-card p-6 border-primary/30 bg-gradient-to-br from-primary/8 to-transparent">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Left — title + steps */}
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 mb-1">Getting Started</p>
          <h2 className="text-xl font-bold font-serif luxury-gradient-text tracking-tight mb-0.5">
            Welcome to TLIS
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            Let's prepare your intelligence workspace.
          </p>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <Link href={step.href} key={i}>
                <div className={`flex items-center gap-3 cursor-pointer group transition-opacity ${step.done ? "opacity-60" : "opacity-100"}`}>
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-primary/40 flex-shrink-0 group-hover:text-primary transition-colors" />
                  )}
                  <span className={`text-sm transition-colors ${step.done ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
                    {step.label}
                  </span>
                  {!step.done && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors ml-auto" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right — progress ring */}
        <div className="flex flex-col items-center gap-2 md:min-w-[96px]">
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(44 54% 54% / 0.12)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke="hsl(44 54% 54%)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold font-serif luxury-gradient-text leading-none">{completed}</span>
              <span className="text-[10px] text-muted-foreground">of {steps.length}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center font-mono">
            {completed}/{steps.length} Complete
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
          <span>Setup Progress</span>
          <span className="text-primary font-mono">{pct}%</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Quick Start Grid ───────────────────────────────────────────────────────

type QuickStartStep = "workspace" | "account" | "content" | null;

interface QuickStartCard {
  label:   string;
  sub:     string;
  href:    string;
  icon:    React.ElementType;
  step:    QuickStartStep;
}

const QUICK_START_CARDS: QuickStartCard[] = [
  { label: "Create Workspace",   sub: "Set up your intelligence hub",    href: "/workspace",    icon: Briefcase,    step: "workspace" },
  { label: "Add TikTok Account", sub: "Connect your TikTok profile",     href: "/accounts",     icon: UserCheck2,   step: "account"   },
  { label: "Generate Content",   sub: "Create your first content pack",  href: "/content-pack", icon: Package,      step: "content"   },
  { label: "Open Calendar",      sub: "Schedule and plan your posts",    href: "/calendar",     icon: CalendarDays, step: null        },
];

function QuickStartGrid({
  nextStep,
  navigate,
}: {
  nextStep: QuickStartStep;
  navigate: (path: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Quick Start</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_START_CARDS.map((card, i) => {
          const isNext    = card.step === nextStep;
          const isDone    = card.step !== null && card.step !== nextStep &&
                            QUICK_START_CARDS.findIndex(c => c.step === card.step) <
                            QUICK_START_CARDS.findIndex(c => c.step === nextStep);
          return (
            <button
              key={i}
              onClick={() => navigate(card.href)}
              className={`luxury-card p-4 text-left transition duration-200 group flex flex-col gap-3
                ${isNext
                  ? "border-primary/50 bg-primary/8 hover:bg-primary/12 shadow-[0_0_20px_hsl(44_54%_54%/0.08)]"
                  : "hover:border-primary/30 hover:bg-primary/5"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-md ${isNext ? "bg-primary/20" : "bg-muted/40"}`}>
                  <card.icon className={`h-4 w-4 ${isNext ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors"}`} />
                </div>
                {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                {isNext && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
              <div>
                <p className={`text-xs font-semibold ${isNext ? "text-primary" : "text-foreground"}`}>
                  {card.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Chart Empty States ─────────────────────────────────────────────────────

function GrowthEmptyState({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="luxury-card p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Growth Trajectory</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Follower growth over time</p>
        </div>
      </div>
      <div className="h-52 flex flex-col items-center justify-center gap-4 text-center">
        <TrendingUp className="h-10 w-10 text-muted-foreground/15" />
        <div>
          <p className="text-sm font-semibold text-muted-foreground">No Growth Data Yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto">
            Growth analytics will appear after your workspace begins generating activity.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/content-pack")}
            className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition text-xs text-primary font-medium"
          >
            Create Content
          </button>
          <button
            onClick={() => navigate("/workspace")}
            className="px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition text-xs text-muted-foreground hover:text-primary font-medium"
          >
            Open Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

function EngagementEmptyState() {
  return (
    <div className="luxury-card p-6">
      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Engagement Rate</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Weekly engagement by day</p>
      </div>
      <div className="h-52 flex flex-col items-center justify-center gap-4 text-center">
        <BarChart2 className="h-10 w-10 text-muted-foreground/15" />
        <div>
          <p className="text-sm font-semibold text-muted-foreground">No Engagement Data Yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-[180px] mx-auto">
            Generate content and publish posts to begin tracking engagement.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Usage summary widget ──────────────────────────────────────────────────

function UsageSummaryWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    setUsage(loadUsage());
    const id = setInterval(() => setUsage(loadUsage()), 5_000);
    return () => clearInterval(id);
  }, []);

  if (!usage) return null;

  const hasActivity =
    usage.daily.generations > 0 ||
    usage.session.generations > 0 ||
    usage.allTime.cost > 0;

  const dailyPct  = Math.min((usage.daily.generations / usage.limits.dailyGenerations) * 100, 100);
  const nearLimit = dailyPct >= 80;
  const overLimit = dailyPct >= 100;
  const barColor  = overLimit ? "bg-destructive"   : nearLimit ? "bg-chart-2"   : "bg-primary";
  const textColor = overLimit ? "text-destructive"  : nearLimit ? "text-chart-2" : "text-primary";
  const borderMod = overLimit ? "border-destructive/40" : nearLimit ? "border-chart-2/40" : "";

  return (
    <div className={`luxury-card p-5 ${borderMod}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${textColor}`} />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Usage</h2>
        </div>
        <Link href="/usage">
          <span className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer">
            Details <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      {!hasActivity ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
          <Zap className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No AI activity yet</p>
          <Link href="/content-pack">
            <span className="text-[11px] text-primary hover:underline cursor-pointer">Generate content →</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground uppercase tracking-wider">Today</span>
              <span className={`font-mono ${textColor}`}>
                {usage.daily.generations} / {usage.limits.dailyGenerations}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary opacity-60" />
              <span className="text-xs text-muted-foreground">{usage.session.generations} this session</span>
            </div>
            <span className="text-xs font-mono text-primary">{formatCost(usage.allTime.cost)} spent</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Status widget ──────────────────────────────────────────────────

interface StatusItem {
  label:  string;
  status: "ok" | "warn" | "error" | "loading";
  detail: string;
}

function SystemStatusWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<StatusItem[]>([
    { label: "Supabase",       status: "loading", detail: "Checking…" },
    { label: "Authentication", status: "loading", detail: "Checking…" },
    { label: "AI Engine",      status: "loading", detail: "Checking…" },
    { label: "Last Update",    status: "ok",      detail: new Date().toLocaleTimeString() },
  ]);

  useEffect(() => {
    setItems(prev => prev.map(i =>
      i.label === "Authentication"
        ? { ...i, status: user ? "ok" : "warn", detail: user ? (user.email ?? "Signed in") : "Not signed in" }
        : i,
    ));

    checkSupabaseConnection().then(ok =>
      setItems(prev => prev.map(i =>
        i.label === "Supabase"
          ? { ...i, status: ok ? "ok" : "error", detail: ok ? "Connected" : "Unreachable" }
          : i,
      )),
    );

    fetch("/api/healthz", { signal: AbortSignal.timeout(3_000) })
      .then(() => setItems(prev => prev.map(i =>
        i.label === "AI Engine" ? { ...i, status: "ok", detail: "Online" } : i,
      )))
      .catch(() => setItems(prev => prev.map(i =>
        i.label === "AI Engine" ? { ...i, status: "warn", detail: "Gemini Ready" } : i,
      )));
  }, [user]);

  const iconFor = (s: StatusItem["status"]) => {
    if (s === "loading") return <Loader2     className="h-3 w-3 animate-spin text-muted-foreground" />;
    if (s === "ok")      return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (s === "warn")    return <AlertCircle  className="h-3 w-3 text-amber-400"   />;
    return                      <AlertCircle  className="h-3 w-3 text-destructive"  />;
  };

  return (
    <div className="luxury-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Wifi className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">System Status</h2>
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {iconFor(item.status)}
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[110px] text-right">
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────

function ActivityFeed({
  events,
  loading,
  authenticated,
}: {
  events: ActivityEvent[];
  loading: boolean;
  authenticated: boolean;
}) {
  return (
    <div className="luxury-card p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Activity Feed</h2>
        {events.length > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">Live</span>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 pb-4 border-b border-border last:border-0">
              <Skeleton className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-3 w-16 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {!loading && !authenticated && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">Sign in to see your activity</p>
          <Link href="/login">
            <button className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition text-xs text-primary font-medium min-h-[44px]">
              Sign In
            </button>
          </Link>
        </div>
      )}

      {!loading && authenticated && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/20" />
          <div>
            <p className="text-sm font-semibold text-muted-foreground">No Recent Activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your activity history will appear here as you use TLIS.
            </p>
          </div>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-4">
          {events.map(item => (
            <div
              key={item.id}
              className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
            >
              <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${EVENT_DOT[item.type]}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${EVENT_COLOR[item.type]}`}>{item.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="h-3 w-3" />
                {timeAgo(item.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Right Column Quick Actions ─────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Generate Content",   sub: "Full content pack",      href: "/content-pack", icon: Package     },
  { label: "Open Workspace",     sub: "Active workspace hub",   href: "/workspace",    icon: Briefcase   },
  { label: "TikTok Accounts",    sub: "Manage linked accounts", href: "/accounts",     icon: UserCheck2  },
  { label: "Intelligence Vault", sub: "Saved AI outputs",       href: "/vault",        icon: Database    },
  { label: "Content Calendar",   sub: "Schedule & plan posts",  href: "/calendar",     icon: CalendarDays },
];

// ── Main Dashboard ────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user }           = useAuth();
  const { activeWorkspace } = useActiveWorkspace();

  const [stats, setStats]                     = useState<(WorkspaceStats & { accounts: number }) | null>(null);
  const [statsLoading, setStatsLoading]       = useState(true);
  const [activity, setActivity]               = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [ws, accounts] = await Promise.all([
        fetchWorkspaceStatsFromCloud(),
        fetchAccountsFromCloud(),
      ]);
      setStats({ ...ws, accounts: accounts.length });
    } catch {
      setStats({ workspaces: 0, contentPacks: 0, vaultEntries: 0, calendarPosts: 0, accounts: 0 });
    } finally {
      setStatsLoading(false);
    }

    try {
      const events = await fetchRecentActivityFromCloud(10);
      setActivity(events);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    window.addEventListener("focus", loadAll);
    return () => window.removeEventListener("focus", loadAll);
  }, [loadAll]);

  // ── Derived state ──────────────────────────────────────────────────────

  const displayName = user?.email
    ? user.email.split("@")[0]!.replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    : "Creator";

  const hasWorkspaces = !statsLoading && (stats?.workspaces   ?? 0) > 0;

  // Onboarding steps — drives both the panel + quick start smart highlight
  const onboardingSteps: OnboardingStep[] = [
    { label: "Create Workspace",            href: "/workspace",    done: (stats?.workspaces   ?? 0) > 0 },
    { label: "Add TikTok Account",          href: "/accounts",     done: (stats?.accounts     ?? 0) > 0 },
    { label: "Generate First Content Pack", href: "/content-pack", done: (stats?.contentPacks ?? 0) > 0 },
    { label: "Save First Vault Entry",      href: "/vault",        done: (stats?.vaultEntries ?? 0) > 0 },
  ];
  const allOnboardingDone  = onboardingSteps.every(s => s.done);
  const showOnboarding     = !!user && !statsLoading && !allOnboardingDone;

  // Smart highlight: the next incomplete step
  const nextStep: QuickStartStep =
    !statsLoading
      ? (stats?.workspaces   ?? 0) === 0 ? "workspace"
      : (stats?.accounts     ?? 0) === 0 ? "account"
      : (stats?.contentPacks ?? 0) === 0 ? "content"
      : null
      : null;

  const statCards = [
    { label: "Workspaces",      value: stats?.workspaces    ?? 0, icon: Briefcase,    href: "/workspace"    },
    { label: "TikTok Accounts", value: stats?.accounts      ?? 0, icon: UserCheck2,   href: "/accounts"     },
    { label: "Content Packs",   value: stats?.contentPacks  ?? 0, icon: Package,      href: "/content-pack" },
    { label: "Vault Entries",   value: stats?.vaultEntries  ?? 0, icon: Database,     href: "/vault"        },
    { label: "Calendar Posts",  value: stats?.calendarPosts ?? 0, icon: CalendarDays, href: "/calendar"     },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* ── Welcome Banner ── */}
      <div className="luxury-card p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary/70 mb-1">Welcome back</p>
            <h1 className="text-2xl md:text-3xl font-bold font-serif luxury-gradient-text tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{user?.email}</p>
          </div>

          {statsLoading ? (
            <Skeleton className="h-10 w-40 rounded-lg" />
          ) : activeWorkspace ? (
            <div className="flex flex-col items-start md:items-end gap-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Active Workspace</p>
              <div className="flex items-center gap-2">
                <div className="live-dot" />
                <span className="text-sm font-semibold text-foreground">{activeWorkspace.workspaceName}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                @{activeWorkspace.username} · {activeWorkspace.niche}
              </span>
            </div>
          ) : hasWorkspaces ? (
            <Link href="/workspace">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition text-sm text-primary font-medium min-h-[44px]">
                <FolderOpen className="h-4 w-4" />
                Open Workspace
              </button>
            </Link>
          ) : (
            <Link href="/workspace">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition text-sm text-primary font-medium min-h-[44px]">
                <Plus className="h-4 w-4" />
                Create Workspace
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Onboarding Panel (shown until all 4 steps done) ── */}
      {showOnboarding && <OnboardingPanel steps={onboardingSteps} />}

      {/* ── Quick Start Grid (shown until all 4 steps done) ── */}
      {showOnboarding && <QuickStartGrid nextStep={nextStep} navigate={navigate} />}

      {/* ── Live Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card, i) => (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="luxury-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition duration-200 group"
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
              <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-7 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-serif font-bold text-foreground mb-1">{card.value}</div>
            )}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
          </button>
        ))}
      </div>

      {/* ── Analytics Row (empty states — no real analytics data yet) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GrowthEmptyState navigate={navigate} />
        <EngagementEmptyState />
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <ActivityFeed
          events={activity}
          loading={activityLoading}
          authenticated={!!user}
        />

        <div className="flex flex-col gap-4">
          <div className="luxury-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.href)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition duration-200 text-left group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <SystemStatusWidget />
          <UsageSummaryWidget />
        </div>
      </div>
    </div>
  );
}
