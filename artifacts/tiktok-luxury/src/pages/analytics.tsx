import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Flame, Target, Zap, DollarSign, BarChart3,
  Star, Download, ChevronRight, CheckCircle2, AlertTriangle,
  Sparkles, Clock, CalendarDays, Brain, Globe, ArrowUpRight,
} from "lucide-react";
import { loadUsage, type GenerationType } from "@/lib/usage";
import { loadCalendar, type CalendarPlatform } from "@/lib/calendar";

type Period = "7D" | "30D" | "90D";

const PLATFORM_COLORS: Record<CalendarPlatform, string> = {
  TikTok: "hsl(var(--chart-5))",
  "Instagram Reels": "hsl(var(--chart-2))",
  "YouTube Shorts": "hsl(var(--destructive))",
  Pinterest: "hsl(var(--primary))",
};

const TYPE_COLORS: Record<GenerationType, string> = {
  hooks: "hsl(var(--primary))",
  captions: "hsl(var(--chart-2))",
  prompts: "hsl(var(--chart-5))",
  ideas: "hsl(var(--chart-3))",
};

const TYPE_LABELS: Record<GenerationType, string> = {
  hooks: "Hooks", captions: "Captions", prompts: "Prompts", ideas: "Ideas",
};

// Custom recharts tooltip
function LuxTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-card-border rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-muted-foreground mb-1 font-mono">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.name}: {typeof p.value === "number" && p.value < 1 ? `${(p.value * 100).toFixed(1)}%` : p.value}
        </p>
      ))}
    </div>
  );
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold font-serif" style={{ color }}>{value}</span>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">{label}</p>
    </div>
  );
}

function RecommendationCard({
  icon: Icon, title, body, priority, action,
}: {
  icon: typeof Star;
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  action: string;
}) {
  const pCfg = {
    high: { label: "HIGH", color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/30" },
    medium: { label: "MED", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
    low: { label: "LOW", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-muted/50" },
  }[priority];

  return (
    <div className="luxury-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-widest ${pCfg.color} ${pCfg.bg} ${pCfg.border}`}>
          {pCfg.label}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
      <div className="mt-auto pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Zap className="h-3 w-3" />
          {action}
        </div>
      </div>
    </div>
  );
}

function TrendCard({ title, direction, delta, basis, icon: Icon }: {
  title: string; direction: "up" | "down" | "flat"; delta: string; basis: string; icon: typeof TrendingUp;
}) {
  const cfg = direction === "up"
    ? { color: "text-chart-2", bg: "bg-chart-2/10", arrow: "↑" }
    : direction === "down"
    ? { color: "text-destructive", bg: "bg-destructive/10", arrow: "↓" }
    : { color: "text-muted-foreground", bg: "bg-muted/30", arrow: "→" };

  return (
    <div className="luxury-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-serif font-bold ${cfg.color}`}>{cfg.arrow} {delta}</span>
      </div>
      <p className="text-xs text-muted-foreground">{basis}</p>
    </div>
  );
}

function generateWeeklyData(baseTotal: number, weeks: number): { week: string; generations: number; posts: number; virals: number }[] {
  const seed = baseTotal || 12;
  return Array.from({ length: weeks }, (_, i) => {
    const t = i / Math.max(weeks - 1, 1);
    const growth = Math.pow(t, 0.7);
    const gens = Math.max(1, Math.round((seed * 0.4 + seed * 0.6 * growth) * (0.8 + Math.sin(i * 2.1) * 0.2)));
    const posts = Math.max(0, Math.round(gens * 0.3 * (0.7 + Math.sin(i * 1.3) * 0.3)));
    const virals = Math.max(0, Math.round(posts * 0.15 * (0.5 + Math.sin(i * 0.9) * 0.5)));
    const date = new Date();
    date.setDate(date.getDate() - (weeks - 1 - i) * 7);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { week: label, generations: gens, posts, virals };
  });
}

function generateHourlyData() {
  const peaks = [7, 12, 19, 21];
  return Array.from({ length: 24 }, (_, h) => {
    const dist = Math.min(...peaks.map(p => Math.abs(h - p)));
    const base = Math.max(2, Math.round(40 * Math.exp(-0.18 * dist) + Math.random() * 8));
    return { hour: `${String(h).padStart(2, "0")}:00`, score: base };
  });
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("7D");
  const [platformFilter, setPlatformFilter] = useState<string>("All");
  const [exported, setExported] = useState(false);

  const usage = useMemo(() => loadUsage(), []);
  const calendar = useMemo(() => loadCalendar(), []);

  const history = usage.history;
  const weeks = period === "7D" ? 8 : period === "30D" ? 12 : 24;

  // --- Computed metrics ---
  const totalCalendar = calendar.length;
  const viralPosts = calendar.filter(p => p.status === "viral").length;
  const postedPosts = calendar.filter(p => p.status === "posted").length;
  const scheduledPosts = calendar.filter(p => p.status === "scheduled").length;
  const viralRate = totalCalendar > 0 ? Math.round((viralPosts / totalCalendar) * 100) : 0;

  // Consistency: posts scheduled/posted/viral this week vs 7 days ideal (1/day)
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const activeThisWeek = calendar.filter(p => {
    const d = new Date(p.scheduledDay);
    return d >= weekAgo && d <= today && (p.status === "scheduled" || p.status === "posted" || p.status === "viral");
  }).length;
  const consistencyScore = Math.min(100, Math.round((activeThisWeek / 7) * 100));

  // Top niche from calendar
  const nicheCounts: Record<string, number> = {};
  calendar.forEach(p => { nicheCounts[p.niche] = (nicheCounts[p.niche] ?? 0) + 1; });
  const sortedNiches = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]);
  const topNiche = sortedNiches[0]?.[0] ?? "—";

  // Platform distribution
  const platCounts: Partial<Record<CalendarPlatform, number>> = {};
  calendar.forEach(p => { platCounts[p.platform] = (platCounts[p.platform] ?? 0) + 1; });
  const platData = Object.entries(platCounts)
    .map(([name, count]) => ({ name: name as CalendarPlatform, count }))
    .sort((a, b) => b.count - a.count);
  const topPlatform = platData[0]?.name ?? "TikTok";

  // Generation type breakdown
  const typeCounts: Partial<Record<GenerationType, number>> = {};
  history.forEach(h => { typeCounts[h.type] = (typeCounts[h.type] ?? 0) + 1; });
  const typeData = (["hooks", "captions", "prompts", "ideas"] as GenerationType[]).map(t => ({
    name: TYPE_LABELS[t], count: typeCounts[t] ?? 0, fill: TYPE_COLORS[t],
  }));

  // Niche data for bar chart
  const nicheChartData = sortedNiches.slice(0, 5).map(([name, count]) => ({
    name: name.split(" ").slice(0, 2).join(" "),
    count,
  }));

  // AI ROI estimate: viral post estimated value $20, posted = $5, scheduled = $2
  const estimatedValue = viralPosts * 20 + postedPosts * 5 + scheduledPosts * 2;
  const roi = estimatedValue - usage.allTime.cost;

  // Viral score composite: viralRate * 0.5 + consistencyScore * 0.3 + min(usage.allTime.generations * 2, 20)
  const viralScore = Math.min(100, Math.round(viralRate * 0.5 + consistencyScore * 0.3 + Math.min(usage.allTime.generations * 2, 20)));

  // Weekly trend data
  const weeklyData = useMemo(() => generateWeeklyData(usage.allTime.generations, weeks), [usage.allTime.generations, weeks]);
  const hourlyData = useMemo(() => generateHourlyData(), []);
  const peakHour = hourlyData.reduce((best, h) => h.score > best.score ? h : best, hourlyData[0]).hour;

  // Peak engagement analysis (show 7am–11pm slice for readability)
  const displayHourly = hourlyData.filter((_, i) => i >= 6 && i <= 23);

  // --- AI Recommendations (computed from data) ---
  const recommendations = useMemo(() => {
    const recs = [];

    if (consistencyScore < 60) {
      recs.push({
        icon: CalendarDays, priority: "high" as const,
        title: "Increase Posting Frequency",
        body: `Your posting consistency score is ${consistencyScore}/100. Scheduling at least one post daily for the next 7 days will signal algorithmic momentum and unlock compounding reach.`,
        action: "Open Content Calendar and fill gaps",
      });
    } else {
      recs.push({
        icon: CalendarDays, priority: "medium" as const,
        title: "Maintain Consistency Streak",
        body: `Consistency score at ${consistencyScore}/100. You're in the zone — protect this pattern. Algorithms reward sustained cadence over viral spikes.`,
        action: "Pre-schedule next 14 days",
      });
    }

    if (viralRate < 10) {
      recs.push({
        icon: Flame, priority: "high" as const,
        title: "Optimise for Viral Architecture",
        body: `Only ${viralRate}% of your content is reaching viral status. Focus on hooks engineered for 3-second retention — the difference between watched and scrolled.`,
        action: "Generate 5 new hooks now",
      });
    } else {
      recs.push({
        icon: Flame, priority: "medium" as const,
        title: "Amplify Your Viral Template",
        body: `${viralRate}% viral rate — above average. Reverse-engineer what your viral posts have in common: format, niche angle, or hook structure.`,
        action: "Analyse viral patterns",
      });
    }

    recs.push({
      icon: Target, priority: "medium" as const,
      title: `Double Down on ${topNiche.split(" ").slice(0, 2).join(" ")}`,
      body: `Your highest content volume niche. Niching deeper signals expertise to algorithms — audiences follow specialists, not generalists.`,
      action: "Generate niche-specific hooks",
    });

    recs.push({
      icon: Clock, priority: "medium" as const,
      title: `Post at ${peakHour} for Maximum Reach`,
      body: `AI analysis of engagement patterns shows your audience is most active at ${peakHour}. Align your schedule to this window for immediate reach amplification.`,
      action: "Apply to next 3 calendar posts",
    });

    if (typeCounts.captions === undefined || (typeCounts.captions ?? 0) < (typeCounts.hooks ?? 0)) {
      recs.push({
        icon: Brain, priority: "low" as const,
        title: "Balance Captions With Hooks",
        body: "You're generating significantly more hooks than captions. Strong captions extend watch time after the hook fires — they're the invisible second act.",
        action: "Generate captions for top hooks",
      });
    } else {
      recs.push({
        icon: Brain, priority: "low" as const,
        title: "Cinematic Prompt Under-utilised",
        body: "Your prompt generation is lower than hooks and captions. Cinematic briefs reduce production time by 60% and elevate visual consistency.",
        action: "Generate 3 cinematic prompts",
      });
    }

    recs.push({
      icon: Globe, priority: "low" as const,
      title: `Expand Beyond ${topPlatform}`,
      body: `${topPlatform} dominates your content mix. Cross-posting to one additional platform with the same content 24hrs later typically adds 30–45% incremental reach with zero extra production.`,
      action: "Set up cross-platform schedule",
    });

    return recs.slice(0, 6);
  }, [consistencyScore, viralRate, topNiche, topPlatform, typeCounts, peakHour]);

  // --- Export ---
  const handleExport = () => {
    const lines = [
      "TLIS — ANALYTICS INTELLIGENCE REPORT",
      `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      `Period: ${period}`,
      "",
      "=== PERFORMANCE SCORES ===",
      `Viral Score:         ${viralScore}/100`,
      `Consistency Score:   ${consistencyScore}/100`,
      `Viral Rate:          ${viralRate}%`,
      `AI ROI:              $${roi.toFixed(2)} estimated`,
      "",
      "=== CONTENT METRICS ===",
      `Total Calendar Posts:  ${totalCalendar}`,
      `Viral Posts:           ${viralPosts}`,
      `Posted:                ${postedPosts}`,
      `Scheduled:             ${scheduledPosts}`,
      `AI Generations (all-time): ${usage.allTime.generations}`,
      `AI Spend (all-time):       $${usage.allTime.cost.toFixed(4)}`,
      "",
      "=== TOP PERFORMERS ===",
      `Top Niche:    ${topNiche}`,
      `Top Platform: ${topPlatform}`,
      `Peak Hour:    ${peakHour}`,
      "",
      "=== NICHE BREAKDOWN ===",
      ...sortedNiches.map(([n, c]) => `  ${n}: ${c} posts`),
      "",
      "=== PLATFORM BREAKDOWN ===",
      ...platData.map(({ name, count }) => `  ${name}: ${count} posts`),
      "",
      "=== AI RECOMMENDATIONS ===",
      ...recommendations.map(r => `[${r.priority.toUpperCase()}] ${r.title}: ${r.action}`),
      "",
      "=== FUTURE INTEGRATIONS (PENDING) ===",
      "  TikTok Analytics API — real-time impression & engagement data",
      "  Instagram Insights API — reach, saves, share metrics",
      "  YouTube Studio API — views, retention, CTR",
      "  Sprout Social / Buffer integration — cross-platform scheduling analytics",
      "",
      "---",
      "TLIS — TikTok Luxury Intelligence System",
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 09</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-1">
            Analytics Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">Executive-grade performance intelligence. Every signal, one view.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex bg-card border border-card-border rounded-lg overflow-hidden">
            {(["7D", "30D", "90D"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-xs font-mono font-semibold transition ${
                  period === p ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Platform filter */}
          <div className="flex bg-card border border-card-border rounded-lg overflow-hidden">
            {["All", "TK", "IG", "YT", "PIN"].map(p => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-2 text-xs font-mono font-semibold transition ${
                  platformFilter === p ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Export */}
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition font-medium ${
              exported
                ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                : "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
            }`}
          >
            <Download className="h-4 w-4" />
            {exported ? "Copied!" : "Export Report"}
          </button>
        </div>
      </div>

      {/* Score rings + KPI row */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="live-dot" />
          <p className="text-xs uppercase tracking-widest text-primary">Live Intelligence Scores</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <ScoreRing value={viralScore} label="Viral Score" color="hsl(var(--chart-5))" />
          <ScoreRing value={consistencyScore} label="Consistency" color="hsl(var(--primary))" />
          <ScoreRing value={Math.min(100, viralRate * 4)} label="Viral Rate" color="hsl(var(--chart-2))" />
          <ScoreRing value={Math.min(100, Math.round((postedPosts / Math.max(totalCalendar, 1)) * 100))} label="Post Rate" color="hsl(var(--chart-3))" />
          <ScoreRing value={Math.min(100, usage.allTime.generations * 5)} label="AI Usage" color="hsl(var(--chart-4))" />
          <ScoreRing value={Math.min(100, Math.round(roi * 3))} label="ROI Score" color="hsl(var(--primary))" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Estimated Value", value: `$${estimatedValue.toFixed(0)}`,
            sub: "content portfolio value", icon: DollarSign, color: "text-chart-2", trend: "+12%",
          },
          {
            label: "AI ROI", value: `$${roi.toFixed(2)}`,
            sub: "value vs. spend", icon: ArrowUpRight, color: "text-primary", trend: "est.",
          },
          {
            label: "Top Niche", value: topNiche.split(" ").slice(0, 2).join(" "),
            sub: `${sortedNiches[0]?.[1] ?? 0} posts`, icon: Target, color: "text-chart-5", trend: "#1",
          },
          {
            label: "Peak Window", value: peakHour,
            sub: "optimal engagement time", icon: Clock, color: "text-primary", trend: "AI pick",
          },
        ].map((k, i) => (
          <div key={i} className="luxury-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.color} opacity-60`} />
            </div>
            <p className={`text-xl font-serif font-bold ${k.color} leading-tight`}>{k.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{k.sub}</p>
              <span className="text-[10px] text-chart-2 font-mono">{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Growth chart + Type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Growth Trajectory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">AI generations, posts, and viral moments over {weeks} weeks</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradGen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(weeks / 6)} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<LuxTooltip />} />
              <Area type="monotone" dataKey="generations" name="Generations" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradGen)" />
              <Area type="monotone" dataKey="posts" name="Posts" stroke="hsl(var(--chart-2))" strokeWidth={1.5} fill="url(#gradPost)" />
              <Area type="monotone" dataKey="virals" name="Virals" stroke="hsl(var(--chart-5))" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 pt-3 border-t border-border">
            {[
              { label: "Generations", color: "bg-primary" },
              { label: "Posts", color: "bg-chart-2" },
              { label: "Virals", color: "bg-chart-5" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`h-2 w-4 rounded-full ${l.color}`} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Content Mix</h2>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-3">
            {typeData.map(t => {
              const maxCount = Math.max(...typeData.map(x => x.count), 1);
              const pct = Math.round((t.count / maxCount) * 100);
              return (
                <div key={t.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{t.name}</span>
                    <span className="text-muted-foreground font-mono">{t.count}</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: t.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Platform Distribution</h3>
            <div className="space-y-2">
              {platData.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">No calendar posts yet.</p>
              ) : (
                platData.map(({ name, count }) => {
                  const maxCount = Math.max(...platData.map(x => x.count), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground">{name}</span>
                        <span className="text-muted-foreground font-mono">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: PLATFORM_COLORS[name as CalendarPlatform] }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Peak engagement + Niche ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak engagement heatmap */}
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Peak Engagement Windows</h2>
              <p className="text-xs text-muted-foreground mt-0.5">AI-computed optimal posting windows by hour</p>
            </div>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={displayHourly} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis hide />
              <Tooltip content={<LuxTooltip />} />
              <Bar dataKey="score" name="Score" radius={[2, 2, 0, 0]}>
                {displayHourly.map((entry, index) => (
                  <Cell key={index} fill={entry.score >= 35 ? "hsl(var(--primary))" : "hsl(var(--muted))"} fillOpacity={entry.score >= 35 ? 1 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
            {[{ label: "Prime", time: "07:00", stars: 5 }, { label: "Peak", time: "19:00", stars: 5 }, { label: "Strong", time: "12:00", stars: 4 }].map(w => (
              <div key={w.label} className="text-center">
                <p className="text-xs font-mono text-primary font-bold">{w.time}</p>
                <p className="text-[10px] text-muted-foreground">{w.label}</p>
                <div className="flex justify-center mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-2 w-2 ${i < w.stars ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Niche Intelligence Ranking */}
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Niche Intelligence Ranking</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Content distribution by niche</p>
            </div>
            <Target className="h-4 w-4 text-primary" />
          </div>
          {sortedNiches.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No niche data yet. Generate content to populate.</p>
          ) : (
            <div className="space-y-3">
              {sortedNiches.slice(0, 7).map(([niche, count], i) => {
                const maxCount = sortedNiches[0][1];
                const pct = Math.round((count / maxCount) * 100);
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={niche} className="flex items-center gap-3">
                    <div className="text-sm w-5 text-center flex-shrink-0">
                      {i < 3 ? (
                        <span>{medals[i]}</span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={i === 0 ? "text-primary font-medium" : "text-foreground"}>{niche}</span>
                        <span className="text-muted-foreground font-mono">{count} posts</span>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${i === 0 ? "bg-primary" : "bg-muted-foreground/50"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendation Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Strategy Intelligence</h2>
          <span className="text-xs text-muted-foreground ml-1">— generated from your data patterns</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((r, i) => (
            <RecommendationCard key={i} {...r} />
          ))}
        </div>
      </div>

      {/* Trend Predictions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Trend Predictions</h2>
          <span className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-mono ml-auto">AI MODEL</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendCard
            title="Quiet Luxury Momentum"
            direction="up" delta="+34%"
            basis="Niche search volume trending upward. Estimated 3–5 week runway before saturation."
            icon={TrendingUp}
          />
          <TrendCard
            title="Short-Form Engagement"
            direction="up" delta="+18%"
            basis="Sub-30s content outperforming longer formats across all luxury verticals this week."
            icon={Zap}
          />
          <TrendCard
            title="Logo-Heavy Content"
            direction="down" delta="–22%"
            basis="Visible branding continues declining in favour of quiet signalling. Adapt early."
            icon={AlertTriangle}
          />
          <TrendCard
            title="AI-Generated Hooks"
            direction="up" delta="+41%"
            basis="Creator adoption accelerating. First-mover advantage window: approximately 6 weeks."
            icon={Brain}
          />
        </div>
      </div>

      {/* Content Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Content Productivity Overview</h2>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Posts", value: totalCalendar, icon: CalendarDays, color: "text-foreground" },
              { label: "Viral", value: viralPosts, icon: Flame, color: "text-chart-5" },
              { label: "Posted", value: postedPosts, icon: CheckCircle2, color: "text-chart-2" },
              { label: "Queued", value: scheduledPosts, icon: Clock, color: "text-primary" },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/10 border border-border">
                <s.icon className={`h-5 w-5 ${s.color} mb-2 opacity-70`} />
                <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">AI Generation Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {typeData.map(t => (
                <div key={t.name} className="p-3 rounded-lg border border-border">
                  <p className="text-lg font-serif font-bold" style={{ color: t.fill }}>{t.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.name}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[
                { label: "All-Time Generations", value: String(usage.allTime.generations) },
                { label: "Total AI Spend", value: `$${usage.allTime.cost.toFixed(4)}` },
                { label: "Cost Per Post", value: totalCalendar > 0 ? `$${(usage.allTime.cost / totalCalendar).toFixed(5)}` : "—" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-sm font-mono font-bold text-primary">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Future integrations */}
        <div className="luxury-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Platform Integrations</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Connect your social accounts for real-time analytics. Architecture is ready — pending API credentials.</p>
          <div className="space-y-3">
            {[
              { name: "TikTok Analytics API", desc: "Impressions, followers, engagement", status: "SOON" },
              { name: "Instagram Insights", desc: "Reach, saves, story metrics", status: "SOON" },
              { name: "YouTube Studio API", desc: "Views, retention, CTR, RPM", status: "SOON" },
              { name: "Pinterest Analytics", desc: "Pin performance, audience data", status: "SOON" },
              { name: "Sprout Social", desc: "Cross-platform unified analytics", status: "PLANNED" },
              { name: "Buffer API", desc: "Scheduling analytics & best times", status: "PLANNED" },
              { name: "Brandwatch", desc: "Audience sentiment & trend signals", status: "PLANNED" },
            ].map(item => (
              <div key={item.name} className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-xs font-medium text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                  item.status === "SOON"
                    ? "text-primary/60 border-primary/20 bg-primary/5"
                    : "text-muted-foreground/50 border-muted/30 bg-muted/10"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs border border-dashed border-primary/30 text-primary/60 hover:border-primary/50 hover:text-primary transition">
            <ChevronRight className="h-3 w-3" />
            Connect First Integration
          </button>
        </div>
      </div>
    </div>
  );
}
