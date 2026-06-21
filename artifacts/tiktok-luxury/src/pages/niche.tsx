import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Target, Zap, Sparkles } from "lucide-react";
import { Link } from "wouter";

const niches = [
  { name: "Quiet Luxury Lifestyle", score: 94, demand: "Explosive", competition: "Low", growth: "+312%", status: "hot" },
  { name: "Dark Feminine Aesthetic", score: 88, demand: "High", competition: "Medium", growth: "+187%", status: "rising" },
  { name: "Minimalist Wealth Flex", score: 82, demand: "High", competition: "Low", growth: "+145%", status: "rising" },
  { name: "Old Money Fashion", score: 79, demand: "Very High", competition: "Medium", growth: "+98%", status: "rising" },
  { name: "Luxury Morning Routine", score: 91, demand: "Explosive", competition: "Low", growth: "+276%", status: "hot" },
  { name: "Cinematic Travel Vlogs", score: 73, demand: "Medium", competition: "High", growth: "+54%", status: "stable" },
  { name: "Understated Opulence", score: 85, demand: "High", competition: "Very Low", growth: "+203%", status: "rising" },
  { name: "Silent Wealth Signals", score: 96, demand: "Explosive", competition: "Very Low", growth: "+441%", status: "hot" },
];

const trendData = [
  { week: "W1", quietLuxury: 42, darkFem: 28, minWealth: 35 },
  { week: "W2", quietLuxury: 51, darkFem: 34, minWealth: 38 },
  { week: "W3", quietLuxury: 67, darkFem: 45, minWealth: 42 },
  { week: "W4", quietLuxury: 89, darkFem: 58, minWealth: 51 },
  { week: "W5", quietLuxury: 112, darkFem: 72, minWealth: 63 },
  { week: "W6", quietLuxury: 148, darkFem: 89, minWealth: 78 },
];

const radarData = [
  { metric: "Demand", value: 94 },
  { metric: "Virality", value: 88 },
  { metric: "Monetize", value: 76 },
  { metric: "Longevity", value: 82 },
  { metric: "Access", value: 91 },
  { metric: "Blue Ocean", value: 97 },
];

const statusStyles: Record<string, string> = {
  hot: "text-primary bg-primary/10 border-primary/30",
  rising: "text-chart-2 bg-chart-2/10 border-chart-2/30",
  stable: "text-muted-foreground bg-muted/40 border-muted/30",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-3 text-xs space-y-1">
        <p className="text-muted-foreground uppercase tracking-wider">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-mono">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Niche() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 01</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Niche Intelligence</h1>
        <p className="text-muted-foreground text-sm">AI-identified market gaps with untapped luxury creator potential.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Niches Tracked", value: "847", icon: Target },
          { label: "Hot Opportunities", value: "23", icon: Zap },
          { label: "Avg Opportunity Score", value: "86.2", icon: TrendingUp },
          { label: "Declining Niches", value: "12", icon: TrendingDown },
        ].map((s, i) => (
          <div key={i} className="luxury-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary opacity-50" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Top Niche Trends</h2>
              <p className="text-xs text-muted-foreground mt-0.5">6-week trajectory</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(44 54% 54%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(44 54% 54%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(35 60% 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(35 60% 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(55 60% 70%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(55 60% 70%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fill: "hsl(44 15% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="quietLuxury" name="Quiet Luxury" stroke="hsl(44 54% 54%)" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="darkFem" name="Dark Feminine" stroke="hsl(35 60% 60%)" strokeWidth={2} fill="url(#g2)" />
                <Area type="monotone" dataKey="minWealth" name="Min. Wealth" stroke="hsl(55 60% 70%)" strokeWidth={2} fill="url(#g3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="luxury-card p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Opportunity Radar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Silent Wealth Signals niche</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="hsl(44 20% 15%)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(44 15% 60%)", fontSize: 10 }} />
                <Radar dataKey="value" stroke="hsl(44 54% 54%)" fill="hsl(44 54% 54%)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Niche Opportunity Matrix</h2>
          <p className="text-xs text-muted-foreground">Click any row to generate content for that niche</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Niche", "Score", "Demand", "Competition", "Growth", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {niches.map((n, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{n.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${n.score}%` }} />
                      </div>
                      <span className="text-xs font-mono text-primary">{n.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{n.demand}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{n.competition}</td>
                  <td className="px-6 py-4 text-sm font-mono text-primary">{n.growth}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium uppercase tracking-wide ${statusStyles[n.status]}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/generator?niche=${encodeURIComponent(n.name)}&tab=hooks`}>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary border border-transparent group-hover:border-primary/30 group-hover:bg-primary/10 px-2.5 py-1.5 rounded-md transition-all duration-200 whitespace-nowrap cursor-pointer">
                        <Sparkles className="h-3 w-3" />
                        Generate
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
