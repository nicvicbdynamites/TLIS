import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Eye, Heart, Star, ArrowRight, Clock, Activity, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadUsage, formatCost, type UsageData } from "@/lib/usage";

const growthData = [
  { month: "Jan", followers: 180000, views: 2400000 },
  { month: "Feb", followers: 320000, views: 3800000 },
  { month: "Mar", followers: 510000, views: 6200000 },
  { month: "Apr", followers: 780000, views: 9100000 },
  { month: "May", followers: 1100000, views: 14500000 },
  { month: "Jun", followers: 1480000, views: 22000000 },
  { month: "Jul", followers: 1820000, views: 38000000 },
  { month: "Aug", followers: 2100000, views: 61000000 },
  { month: "Sep", followers: 2450192, views: 84200000 },
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
  { action: "Video went viral", detail: '"Morning Luxury Routine" — 4.2M views', time: "2h ago", type: "viral" },
  { action: "New hook detected", detail: '"POV: You found the secret brand…" trending +340%', time: "4h ago", type: "hook" },
  { action: "Competitor alert", detail: "@LuxuryLifeDaily gained 120K followers', time: '6h ago", type: "alert" },
  { action: "Niche opportunity", detail: '"Quiet Luxury Kitchen" — 89% untapped', time: "8h ago", type: "niche" },
  { action: "Automation completed", detail: "12 posts scheduled for next 7 days", time: "12h ago", type: "auto" },
];

const typeColors: Record<string, string> = {
  viral: "text-primary",
  hook: "text-chart-2",
  alert: "text-destructive",
  niche: "text-chart-5",
  auto: "text-muted-foreground",
};

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
  const overLimit = dailyPct >= 100;

  return (
    <div className={`luxury-card p-5 ${overLimit ? "border-destructive/40" : nearLimit ? "border-chart-2/40" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${overLimit ? "text-destructive" : nearLimit ? "text-chart-2" : "text-primary"}`} />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Usage</h2>
        </div>
        <a href="/usage" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          Details <ArrowRight className="h-3 w-3" />
        </a>
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

const QUICK_ACTIONS = [
  { label: "Generate Hook",  sub: "AI writes viral opener",   href: "/generator?tab=hooks" },
  { label: "Analyze Niche",  sub: "Scan market gaps",         href: "/niche" },
  { label: "Spy Competitor", sub: "Deep content audit",       href: "/competitors" },
  { label: "Schedule Post",  sub: "Optimal time AI pick",     href: "/calendar" },
  { label: "New Prompt",     sub: "Cinematic direction",      href: "/prompts" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();

  const stats = [
    { label: "Total Followers", value: "2.45M", change: "+12.4%", icon: TrendingUp },
    { label: "Total Views", value: "84.2M", change: "+45.2%", icon: Eye },
    { label: "Avg Engagement", value: "14.8%", change: "+2.1%", icon: Heart },
    { label: "Viral Score", value: "98/100", change: "Elite", icon: Star },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">TikTok Luxury Intelligence System</p>
        <h1 className="text-4xl md:text-5xl font-bold luxury-gradient-text tracking-tight leading-tight mb-2">
          AI-Powered Luxury<br className="hidden md:block" /> TikTok Operating System
        </h1>
        <p className="text-muted-foreground mt-3">Real-time intelligence. Cinematic content. Unfair advantage.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="luxury-card p-6"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-primary opacity-60" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground mb-2">{stat.value}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {stat.change}
              </span>
              <span className="text-xs text-muted-foreground">vs last 30d</span>
            </div>
          </div>
        ))}
      </div>

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
                    <stop offset="5%" stopColor="hsl(44 54% 54%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(44 54% 54%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "hsl(44 15% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(44 54% 54%)"
                  strokeWidth={2}
                  fill="url(#goldGrad)"
                />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Intelligence Feed</h2>
            <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
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

        <div className="flex flex-col gap-6">
        <div className="luxury-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-6">Quick Actions</h2>
          <div className="space-y-3">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.href)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.sub}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
        <UsageSummaryWidget />
        </div>
      </div>
    </div>
  );
}
