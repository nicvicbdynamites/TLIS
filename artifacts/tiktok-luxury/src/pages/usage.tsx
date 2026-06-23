import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  BarChart2, AlertTriangle, RefreshCw, ShieldCheck, Zap, Film, Lightbulb, MessageSquare, Crown,
} from "lucide-react";
import {
  loadUsage, resetSession, resetDaily, resetAllTime, setTier, setLimits,
  isOverDailyLimit, isNearDailyLimit, isOverCostLimit,
  formatCost, formatTimestamp,
  TYPE_LABELS, TIER_LABELS,
  type UsageData, type TierType, type GenerationType,
} from "@/lib/usage";
import { syncGenerationsWithCloud } from "@/lib/supabase";

const TYPE_ICONS: Record<GenerationType, typeof Zap> = {
  hooks: Zap,
  captions: MessageSquare,
  prompts: Film,
  ideas: Lightbulb,
};

const TIERS: TierType[] = ["free", "pro", "elite"];

const TIER_FEATURES: Record<TierType, string[]> = {
  free: ["10 generations / day", "Up to $0.50/mo spend", "100-entry history"],
  pro: ["100 generations / day", "Up to $5.00/mo spend", "Full history", "Priority generation"],
  elite: ["1,000 generations / day", "Up to $50.00/mo spend", "Unlimited history", "Priority + batch generation", "API access"],
};

function ProgressBar({ value, max, warn, danger }: { value: number; max: number; warn?: boolean; danger?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = danger ? "bg-destructive" : warn ? "bg-chart-2" : "bg-primary";
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({
  label, value, sub, warn, icon: Icon,
}: {
  label: string; value: string; sub: string; warn?: boolean; icon: typeof BarChart2;
}) {
  return (
    <div className={`luxury-card p-5 ${warn ? "border-chart-2/40" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${warn ? "text-chart-2" : "text-primary"} opacity-60`} />
      </div>
      <p className={`text-2xl font-serif font-bold ${warn ? "text-chart-2" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-2.5 text-xs space-y-1">
        <p className="text-muted-foreground uppercase tracking-wider">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-primary font-mono">{p.name}: {typeof p.value === "number" && p.value < 1 ? formatCost(p.value) : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

function buildChartData(history: UsageData["history"]) {
  const byType: Record<string, number> = { hooks: 0, captions: 0, prompts: 0, ideas: 0 };
  history.forEach(h => { byType[h.type] = (byType[h.type] ?? 0) + 1; });
  return [
    { name: "Hooks", count: byType.hooks },
    { name: "Captions", count: byType.captions },
    { name: "Prompts", count: byType.prompts },
    { name: "Ideas", count: byType.ideas },
  ];
}

function buildCostTrend(history: UsageData["history"]) {
  const byDay: Record<string, number> = {};
  history.forEach(h => {
    const day = h.timestamp.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + h.cost;
  });
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, cost]) => ({
      day: new Date(date).toLocaleDateString([], { month: "short", day: "numeric" }),
      cost: parseFloat(cost.toFixed(5)),
    }));
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData>(() => loadUsage());
  const [confirmReset, setConfirmReset] = useState<"session" | "daily" | "alltime" | null>(null);
  const [customDailyLimit, setCustomDailyLimit] = useState(String(data.limits.dailyGenerations));

  const reload = useCallback(() => setData(loadUsage()), []);
  const didSyncRef = useRef(false);

  useEffect(() => {
    const id = setInterval(reload, 3000);
    return () => clearInterval(id);
  }, [reload]);

  // Cloud sync on mount — pull history from Supabase, merge with local
  useEffect(() => {
    if (didSyncRef.current) return;
    didSyncRef.current = true;
    const current = loadUsage();
    syncGenerationsWithCloud(current.history).then(({ history, synced }) => {
      if (synced && history.length > current.history.length) {
        // Rebuild allTime totals from merged history
        const allTimeCost = history.reduce((s, e) => s + e.cost, 0);
        setData(prev => ({
          ...prev,
          history,
          allTime: {
            generations: history.length,
            cost: allTimeCost,
          },
        }));
      }
    }).catch(() => null);
  }, []);

  const overDaily = isOverDailyLimit(data);
  const nearDaily = isNearDailyLimit(data);
  const overCost = isOverCostLimit(data);

  const chartData = buildChartData(data.history);
  const costTrend = buildCostTrend(data.history);

  const handleReset = (scope: "session" | "daily" | "alltime") => {
    if (scope === "session") setData(resetSession(data));
    if (scope === "daily") setData(resetDaily(data));
    if (scope === "alltime") setData(resetAllTime(data));
    setConfirmReset(null);
  };

  const handleTierChange = (tier: TierType) => {
    setData(setTier(data, tier));
    setCustomDailyLimit(String(data.limits.dailyGenerations));
  };

  const handleApplyLimit = () => {
    const n = parseInt(customDailyLimit, 10);
    if (!isNaN(n) && n > 0) {
      setData(setLimits(data, { ...data.limits, dailyGenerations: n }));
    }
  };

  const sessionAge = () => {
    const diff = Date.now() - new Date(data.session.startedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m session`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m session`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 10</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Usage Tracker</h1>
          <p className="text-muted-foreground text-sm">Real-time AI consumption analytics. Every generation accounted for.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold uppercase tracking-wide ${
            data.tier === "elite" ? "text-primary bg-primary/10 border-primary/30" :
            data.tier === "pro" ? "text-chart-2 bg-chart-2/10 border-chart-2/30" :
            "text-muted-foreground bg-muted/30 border-muted/50"
          }`}>
            <Crown className="inline h-3 w-3 mr-1" />
            {TIER_LABELS[data.tier].label} Tier
          </span>
          <button
            onClick={reload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(overDaily || overCost || nearDaily) && (
        <div className="space-y-2">
          {overDaily && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/40 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">Daily generation limit reached ({data.limits.dailyGenerations} generations). Resets at midnight.</p>
            </div>
          )}
          {!overDaily && nearDaily && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-chart-2/40 bg-chart-2/10">
              <AlertTriangle className="h-4 w-4 text-chart-2 flex-shrink-0" />
              <p className="text-sm text-chart-2">Approaching daily limit — {data.limits.dailyGenerations - data.daily.generations} generations remaining today.</p>
            </div>
          )}
          {overCost && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/40 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">Estimated spend has reached your monthly cost limit ({formatCost(data.limits.monthlyCostUsd)}).</p>
            </div>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Session Generations"
          value={String(data.session.generations)}
          sub={sessionAge()}
          icon={Zap}
        />
        <StatCard
          label="Today's Generations"
          value={String(data.daily.generations)}
          sub={`Limit: ${data.limits.dailyGenerations}`}
          warn={nearDaily || overDaily}
          icon={BarChart2}
        />
        <StatCard
          label="Session Cost"
          value={formatCost(data.session.cost)}
          sub="Gemini 2.5 Flash · ~$0.0004/gen"
          icon={ShieldCheck}
        />
        <StatCard
          label="All-Time Spend"
          value={formatCost(data.allTime.cost)}
          sub={`${data.allTime.generations} total generations`}
          warn={overCost}
          icon={Crown}
        />
      </div>

      {/* Limits progress */}
      <div className="luxury-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-5">Limit Utilisation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily Generations</p>
              <p className="text-xs font-mono text-primary">{data.daily.generations} / {data.limits.dailyGenerations}</p>
            </div>
            <ProgressBar
              value={data.daily.generations}
              max={data.limits.dailyGenerations}
              warn={nearDaily}
              danger={overDaily}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost Limit</p>
              <p className="text-xs font-mono text-primary">{formatCost(data.allTime.cost)} / {formatCost(data.limits.monthlyCostUsd)}</p>
            </div>
            <ProgressBar
              value={data.allTime.cost}
              max={data.limits.monthlyCostUsd}
              warn={data.allTime.cost >= data.limits.monthlyCostUsd * 0.8}
              danger={overCost}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="luxury-card p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Generations by Type</h2>
            <p className="text-xs text-muted-foreground mt-0.5">All-time breakdown</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fill: "hsl(44 15% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Generations" fill="hsl(44 54% 54%)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="luxury-card p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Cost Trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Last 7 days · USD</p>
          </div>
          <div className="h-48">
            {costTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrend}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(44 54% 54%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(44 54% 54%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "hsl(44 15% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cost" name="Spend" stroke="hsl(44 54% 54%)" strokeWidth={2} fill="url(#costGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">No data yet — generate some content first</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History + controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History log */}
        <div className="luxury-card overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Generation History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{data.history.length} of 100 stored</p>
            </div>
          </div>
          <div className="overflow-y-auto max-h-96">
            {data.history.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">No generations recorded yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    {["Type", "Niche", "Tone", "Time", "Cost"].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 text-xs uppercase tracking-widest text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((entry) => {
                    const Icon = TYPE_ICONS[entry.type];
                    return (
                      <tr key={entry.id} className="border-b border-border/40 hover:bg-primary/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-primary opacity-70" />
                            <span className="text-xs text-foreground font-medium">{TYPE_LABELS[entry.type]}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{entry.niche}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{entry.tone}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                        <td className="px-5 py-3 text-xs text-primary font-mono">{formatCost(entry.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          {/* Limit controls */}
          <div className="luxury-card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Custom Limits</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Daily Generation Cap</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={customDailyLimit}
                  onChange={e => setCustomDailyLimit(e.target.value)}
                  className="flex-1 bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={handleApplyLimit}
                  className="px-3 py-2 rounded-lg text-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Reset controls */}
          <div className="luxury-card p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Reset Counters</h2>
            {(["session", "daily", "alltime"] as const).map(scope => {
              const labels = { session: "Reset Session", daily: "Reset Daily", alltime: "Reset All Time" };
              const isConfirming = confirmReset === scope;
              return (
                <div key={scope}>
                  {isConfirming ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReset(scope)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmReset(null)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/30 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmReset(scope)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-destructive/30 hover:bg-destructive/5 text-xs text-muted-foreground hover:text-destructive transition-all group"
                    >
                      <span>{labels[scope]}</span>
                      <RefreshCw className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tier selector */}
          <div className="luxury-card p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Subscription Tier</h2>
            <div className="space-y-2">
              {TIERS.map(tier => {
                const { label, color } = TIER_LABELS[tier];
                const isActive = data.tier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => handleTierChange(tier)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 border-primary/40"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-primary" : color}`}>
                        <Crown className="inline h-3 w-3 mr-1" />
                        {label}
                      </span>
                      {isActive && <span className="text-xs text-primary font-mono">Active</span>}
                    </div>
                    <ul className="space-y-0.5">
                      {TIER_FEATURES[tier].map(f => (
                        <li key={f} className="text-xs text-muted-foreground">{f}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
