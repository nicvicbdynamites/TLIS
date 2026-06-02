import { useState } from "react";
import { Bot, CheckCircle2, Circle, Clock, Zap, ChevronDown, ChevronUp, Play, Pause } from "lucide-react";

const plans = [
  {
    id: 1,
    name: "Viral Hook Machine",
    description: "Posts 3 hook-driven videos per week, AI-optimized for peak engagement windows",
    enabled: true,
    progress: 73,
    nextRun: "Tomorrow 7:00 AM",
    category: "Content",
    stats: { postsQueued: 3, avgViews: "1.2M", successRate: "94%" },
    steps: [
      { label: "AI generates 5 hook variations", status: "done" },
      { label: "Selects top performer via scoring model", status: "done" },
      { label: "Pairs with trending audio", status: "done" },
      { label: "Schedules post for optimal window", status: "active" },
      { label: "Monitors for 2h and boosts if viral signal detected", status: "pending" },
    ],
  },
  {
    id: 2,
    name: "Competitor Response Protocol",
    description: "Monitors top 10 competitors and auto-generates counter-content within 4 hours of their viral posts",
    enabled: true,
    progress: 45,
    nextRun: "Monitoring continuously",
    category: "Intelligence",
    stats: { postsQueued: 1, avgViews: "890K", successRate: "78%" },
    steps: [
      { label: "Scan competitor feeds every 30 minutes", status: "done" },
      { label: "Detect viral breakout (>500K views in 2h)", status: "active" },
      { label: "AI analyzes their hook structure", status: "pending" },
      { label: "Generate superior version with unique angle", status: "pending" },
      { label: "Deploy within 4-hour response window", status: "pending" },
    ],
  },
  {
    id: 3,
    name: "Niche Saturation Scanner",
    description: "Weekly deep scan of 200+ niches, automatically flags emerging opportunities with less than 30% saturation",
    enabled: false,
    progress: 0,
    nextRun: "Paused",
    category: "Research",
    stats: { postsQueued: 0, avgViews: "—", successRate: "88%" },
    steps: [
      { label: "Pull trending hashtag data from all regions", status: "pending" },
      { label: "Score niches by demand vs. competition ratio", status: "pending" },
      { label: "Cross-reference with your current content", status: "pending" },
      { label: "Generate opportunity report", status: "pending" },
      { label: "Alert on niches above threshold score", status: "pending" },
    ],
  },
  {
    id: 4,
    name: "Luxury Aesthetic Engine",
    description: "Auto-generates 7 days of cinematic prompts tailored to current luxury trends on TikTok",
    enabled: true,
    progress: 100,
    nextRun: "Next cycle: Sunday",
    category: "Creative",
    stats: { postsQueued: 7, avgViews: "1.8M", successRate: "91%" },
    steps: [
      { label: "Analyze current luxury content performance", status: "done" },
      { label: "Identify top visual styles this week", status: "done" },
      { label: "Generate 14 cinematic direction prompts", status: "done" },
      { label: "Score and rank by predicted performance", status: "done" },
      { label: "Deliver to Prompt Vault", status: "done" },
    ],
  },
  {
    id: 5,
    name: "Engagement Amplifier",
    description: "Comments, replies, and engages with top luxury creators to grow authority and visibility in the niche",
    enabled: true,
    progress: 61,
    nextRun: "Running now",
    category: "Growth",
    stats: { postsQueued: 0, avgViews: "—", successRate: "82%" },
    steps: [
      { label: "Identify 20 highest-leverage creators to engage", status: "done" },
      { label: "Generate authentic, high-value comment drafts", status: "done" },
      { label: "Post during creator's peak engagement window", status: "active" },
      { label: "Track profile visits from engagement", status: "pending" },
      { label: "Adjust target list based on conversion", status: "pending" },
    ],
  },
];

const categoryColors: Record<string, string> = {
  Content: "text-primary bg-primary/10 border-primary/30",
  Intelligence: "text-chart-2 bg-chart-2/10 border-chart-2/30",
  Research: "text-chart-3 bg-chart-3/10 border-chart-3/30",
  Creative: "text-chart-5 bg-chart-5/10 border-chart-5/30",
  Growth: "text-chart-4 bg-chart-4/10 border-chart-4/30",
};

const statusIcon = (status: string) => {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />;
  if (status === "active") return <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center"><div className="live-dot" /></div>;
  return <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />;
};

export default function Automation() {
  const [enabled, setEnabled] = useState<Record<number, boolean>>(
    Object.fromEntries(plans.map(p => [p.id, p.enabled]))
  );
  const [expanded, setExpanded] = useState<number | null>(1);

  const activePlans = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 05</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">AI Automation Plans</h1>
        <p className="text-muted-foreground text-sm">Your always-on content intelligence engine. Set it up once. Let it run.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Plans", value: `${activePlans}/5`, icon: Zap },
          { label: "Posts Queued", value: "11", icon: Bot },
          { label: "Avg Success Rate", value: "86.6%", icon: CheckCircle2 },
          { label: "Tasks Running", value: "3", icon: Clock },
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

      <div className="space-y-4">
        {plans.map((plan, i) => {
          const isEnabled = enabled[plan.id];
          const isExpanded = expanded === plan.id;

          return (
            <div
              key={plan.id}
              className={`luxury-card overflow-hidden transition-all duration-300 ${!isEnabled ? "opacity-60" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="p-5 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : plan.id)}
              >
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isEnabled ? "bg-primary" : "bg-muted-foreground"} ${isEnabled && plan.progress > 0 && plan.progress < 100 ? "animate-pulse" : ""}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${categoryColors[plan.category]}`}>
                      {plan.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                </div>

                <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Next run</p>
                    <p className="text-xs font-mono text-foreground mt-0.5">{plan.nextRun}</p>
                  </div>
                </div>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    setEnabled(prev => ({ ...prev, [plan.id]: !prev[plan.id] }));
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all duration-200 flex-shrink-0 ${
                    isEnabled
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {isEnabled ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                </button>

                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>

              {isEnabled && plan.progress > 0 && (
                <div className="px-5 pb-0">
                  <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000"
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="px-5 pb-5 pt-4 border-t border-border mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Workflow Steps</p>
                      <div className="space-y-3">
                        {plan.steps.map((step, j) => (
                          <div key={j} className="flex items-start gap-3">
                            {statusIcon(step.status)}
                            <p className={`text-sm leading-relaxed ${
                              step.status === "done" ? "text-muted-foreground line-through" :
                              step.status === "active" ? "text-foreground font-medium" :
                              "text-muted-foreground"
                            }`}>
                              {step.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Performance Stats</p>
                      <div className="space-y-3">
                        {Object.entries(plan.stats).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                            <p className="text-sm font-mono text-primary">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
