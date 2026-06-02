import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Eye, Users, BarChart2 } from "lucide-react";

const competitors = [
  {
    handle: "@LuxuryLifeDaily",
    name: "Sophia Laurent",
    niche: "Quiet Luxury",
    followers: "3.2M",
    growth: "+8.4%",
    avgViews: "2.1M",
    postFreq: "Daily",
    engRate: "12.3%",
    trend: "up",
    data: [
      { w: "W1", v: 2800000 }, { w: "W2", v: 3000000 }, { w: "W3", v: 2600000 },
      { w: "W4", v: 3400000 }, { w: "W5", v: 3100000 }, { w: "W6", v: 3200000 },
    ],
    topContent: "Old money capsule wardrobe reveal",
    weakness: "Low posting consistency on weekends",
  },
  {
    handle: "@TheQuietWealthy",
    name: "Marcus Ashford",
    niche: "Silent Wealth",
    followers: "1.8M",
    growth: "+14.2%",
    avgViews: "1.4M",
    postFreq: "3x/week",
    engRate: "16.7%",
    trend: "up",
    data: [
      { w: "W1", v: 900000 }, { w: "W2", v: 1100000 }, { w: "W3", v: 1300000 },
      { w: "W4", v: 1200000 }, { w: "W5", v: 1600000 }, { w: "W6", v: 1800000 },
    ],
    topContent: "Things wealthy people never buy",
    weakness: "Lacks product placement revenue stream",
  },
  {
    handle: "@CinematicRich",
    name: "Elara Voss",
    niche: "Luxury Aesthetics",
    followers: "4.7M",
    growth: "-1.2%",
    avgViews: "890K",
    postFreq: "2x/day",
    engRate: "6.1%",
    trend: "down",
    data: [
      { w: "W1", v: 5200000 }, { w: "W2", v: 5100000 }, { w: "W3", v: 4900000 },
      { w: "W4", v: 4800000 }, { w: "W5", v: 4700000 }, { w: "W6", v: 4700000 },
    ],
    topContent: "Capri yacht season vlog",
    weakness: "Over-posting killing engagement rate",
  },
  {
    handle: "@OldMoneyVibes",
    name: "Charlotte Reed",
    niche: "Old Money",
    followers: "920K",
    growth: "+22.8%",
    avgViews: "1.8M",
    postFreq: "4x/week",
    engRate: "21.4%",
    trend: "up",
    data: [
      { w: "W1", v: 410000 }, { w: "W2", v: 520000 }, { w: "W3", v: 640000 },
      { w: "W4", v: 730000 }, { w: "W5", v: 840000 }, { w: "W6", v: 920000 },
    ],
    topContent: "Why I only wear 12 items",
    weakness: "Relies on single content format",
  },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-2 text-xs">
        <p className="text-primary font-mono">{(payload[0].value / 1000000).toFixed(1)}M</p>
      </div>
    );
  }
  return null;
};

export default function Competitors() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 04</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Competitor Tracking</h1>
        <p className="text-muted-foreground text-sm">Deep intelligence on the creators competing for your audience's attention.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tracked Creators", value: "48", icon: Users },
          { label: "Growing Threats", value: "12", icon: TrendingUp },
          { label: "Declining", value: "9", icon: TrendingDown },
          { label: "Avg Market Share", value: "2.3%", icon: BarChart2 },
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

      <div className="space-y-5">
        {competitors.map((c, i) => (
          <div key={i} className="luxury-card p-6" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex items-start gap-4 lg:w-72 flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/60 to-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="font-serif text-sm font-bold text-primary">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{c.handle}</p>
                  <p className="text-xs text-muted-foreground">{c.name}</p>
                  <span className="text-xs px-2 py-0.5 bg-muted/30 border border-muted/50 rounded-full text-muted-foreground mt-1 inline-block">{c.niche}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Followers</p>
                  <p className="text-lg font-serif font-bold text-foreground">{c.followers}</p>
                  <div className={`flex items-center gap-1 text-xs font-mono mt-0.5 ${c.trend === "up" ? "text-primary" : "text-destructive"}`}>
                    {c.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {c.growth}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Avg Views</p>
                  <p className="text-lg font-serif font-bold text-foreground">{c.avgViews}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.postFreq}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Engagement</p>
                  <p className="text-lg font-serif font-bold text-foreground">{c.engRate}</p>
                  <div className="w-full h-1 bg-muted rounded-full mt-2">
                    <div
                      className={`h-full rounded-full ${c.trend === "up" ? "bg-primary" : "bg-destructive"}`}
                      style={{ width: `${Math.min(parseFloat(c.engRate), 25) * 4}%` }}
                    />
                  </div>
                </div>
                <div className="h-16">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Trend</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={c.data}>
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={c.trend === "up" ? "hsl(44 54% 54%)" : "hsl(0 84% 60%)"}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Top Content</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Eye className="h-3 w-3 text-primary flex-shrink-0" />
                  {c.topContent}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Identified Weakness</p>
                <p className="text-sm text-muted-foreground">{c.weakness}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
