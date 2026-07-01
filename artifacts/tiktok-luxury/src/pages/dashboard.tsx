import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  TrendingUp, Eye, Heart, Star, ArrowRight, Clock,
  Activity, Zap, Briefcase, UserCheck2, Package, Database,
  CalendarDays, CheckCircle2, AlertCircle, Loader2, Wifi,
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
  type WorkspaceStats,
} from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

// ── Static chart data ─────────────────────────────────────────────────────

const growthData = [
  { month: "Jan", followers: 180000 },
  { month: "Feb", followers: 320000 },
  { month: "Mar", followers: 510000 },
  { month: "Apr", followers: 780000 },
  { month: "May", followers: 1100000 },
  { month: "Jun", followers: 1480000 },
  { month: "Jul", followers: 1820000 },
  { month: "Aug", followers: 2100000 },
  { month: "Sep", followers: 2450192 },
];

const engagementData = [
  { day: "Mon", rate: 12.4 },
  { day: "Tue", rate: 15.8 },
  { day: "Wed", rate: 11.2 },
  { day: "Thu", rate: 18.6 },
  { day: "Fri", rate: 22.1 },
  { day: "Sat", rate: 19.4 },
  { day: "Sun", rate: 14.8 },
];

const activity = [
  { action: "Video went viral",    detail: '"Morning Luxury Routine" — 4.2M views',          time: "2h ago",  type: "viral" },
  { action: "New hook detected",   detail: '"POV: You found the secret brand…" +340%',        time: "4h ago",  type: "hook"  },
  { action: "Competitor alert",    detail: "@LuxuryLifeDaily gained 120K followers",          time: "6h ago",  type: "alert" },
  { action: "Niche opportunity",   detail: '"Quiet Luxury Kitchen" — 89% untapped',           time: "8h ago",  type: "niche" },
  { action: "Automation complete", detail: "12 posts scheduled for next 7 days",              time: "12h ago", type: "auto"  },
];

const typeColors: Record<string, string> = {
  viral: "text-primary", hook: "text-chart-2", alert: "text-destructive",
  niche: "text-chart-5", auto: "text-muted-foreground",
};

// ── Custom chart tooltip ──────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-3 text-xs">
        <p className="text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-primary font-mono">
            {typeof p.value === "number" && p.value > 10000
              ? (p.value / 1000000).toFixed(1) + "M"
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Usage summary widget ──────────────────────────────────────────────────

function UsageSummaryWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    setUsage(loadUsage());
    const id = setInterval(() => setUsage(loadUsage()), 5000);
    return () => clearInterval(id);
  }, []);

  if (!usage) return null;

  const dailyPct = Math.min((usage.daily.generations / usage.limits.dailyGenerations) * 100, 100);
  const nearLimit = dailyPct >= 80;
  const overLimit  = dailyPct >= 100;

  return (
    <div className={`luxury-card p-5 ${overLimit ? "border-destructive/40" : nearLimit ? "border-chart-2/40" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${overLimit ? "text-destructive" : nearLimit ? "text-chart-2" : "text-primary"}`} />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Usage</h2>
        </div>
        <Link href="/usage">
          <span className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer">
            Details <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground uppercase tracking-wider">Today</span>
            <span className={`font-mono ${overLimit ? "text-destructive" : nearLimit ? "text-chart-2" : "text-primary"}`}>
              {usage.daily.generations} / {usage.limits.dailyGenerations}
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${overLimit ? "bg-destructive" : nearLimit ? "bg-chart-2" : "bg-primary"}`}
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
        ? { ...i, status: user ? "ok" : "warn", detail: user ? user.email ?? "Signed in" : "Not signed in" }
        : i,
    ));

    // Supabase check
    checkSupabaseConnection().then(ok => {
      setItems(prev => prev.map(i =>
        i.label === "Supabase"
          ? { ...i, status: ok ? "ok" : "error", detail: ok ? "Connected" : "Unreachable" }
          : i,
      ));
    });

    // API Server check
    fetch("/api/healthz", { signal: AbortSignal.timeout(3000) })
      .then(() => {
        setItems(prev => prev.map(i =>
          i.label === "AI Engine" ? { ...i, status: "ok", detail: "Online" } : i,
        ));
      })
      .catch(() => {
        setItems(prev => prev.map(i =>
          i.label === "AI Engine" ? { ...i, status: "warn", detail: "Gemini Ready" } : i,
        ));
      });
  }, [user]);

  const iconFor = (s: StatusItem["status"]) => {
    if (s === "loading") return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
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
            <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[100px] text-right">
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Generate Content",       sub: "Full content pack",       href: "/content-pack", icon: Package    },
  { label: "Open Workspace",         sub: "Active workspace hub",    href: "/workspace",    icon: Briefcase  },
  { label: "TikTok Accounts",        sub: "Manage linked accounts",  href: "/accounts",     icon: UserCheck2 },
  { label: "Intelligence Vault",     sub: "Saved AI outputs",        href: "/vault",        icon: Database   },
  { label: "Content Calendar",       sub: "Schedule & plan posts",   href: "/calendar",     icon: CalendarDays },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { activeWorkspace } = useActiveWorkspace();

  const [stats, setStats] = useState<(WorkspaceStats & { accounts: number }) | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const displayName = user?.email
    ? user.email.split("@")[0]!.replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    : "Creator";

  const statCards = [
    { label: "Workspaces",     value: stats?.workspaces ?? 0,    icon: Briefcase,   href: "/workspace"    },
    { label: "TikTok Accounts",value: stats?.accounts ?? 0,      icon: UserCheck2,  href: "/accounts"     },
    { label: "Content Packs",  value: stats?.contentPacks ?? 0,  icon: Package,     href: "/content-pack" },
    { label: "Vault Entries",  value: stats?.vaultEntries ?? 0,  icon: Database,    href: "/vault"        },
    { label: "Calendar Posts", value: stats?.calendarPosts ?? 0, icon: CalendarDays,href: "/calendar"     },
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
          {activeWorkspace && (
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
          )}
          {!activeWorkspace && (
            <Link href="/workspace">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-sm text-primary font-medium">
                <Briefcase className="h-4 w-4" />
                Set Up Workspace
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Real Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card, i) => (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="luxury-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
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

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Growth Trajectory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Followers over 9 months</p>
            </div>
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">+1,360%</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(44 54% 54%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(44 54% 54%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "hsl(44 15% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="followers" stroke="hsl(44 54% 54%)" strokeWidth={2} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="luxury-card p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Engagement Rate</h2>
            <p className="text-xs text-muted-foreground mt-0.5">This week by day</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData} barCategoryGap="30%">
                <XAxis dataKey="day" tick={{ fill: "hsl(44 15% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" fill="hsl(44 54% 54%)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Intelligence Feed */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Intelligence Feed</h2>
          </div>
          <div className="space-y-4">
            {activity.map((item, i) => (
              <div key={i} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${typeColors[item.type]}`}>{item.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">

          {/* Quick Actions */}
          <div className="luxury-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.href)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
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
