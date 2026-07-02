import {
  Crown, TrendingUp, AlertTriangle, Sparkles, Target, Users,
  Clock, ArrowRight, RefreshCw, Pencil, Flame, Eye, Share2,
  Bookmark, MessageCircle, Hash, Music2, Lightbulb, Megaphone,
  Image, CheckCircle2, Circle, ChevronRight, BrainCircuit,
  BarChart3, Gauge, Star, Zap, Shield, Radio,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useState, useCallback } from "react";
import { aiService, type BriefResult } from "@/lib/ai-provider";
import { useTrendSummary } from "@/lib/trends-provider";
import { useRedditSummary } from "@/lib/reddit-provider";

// ── Greeting ──────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ── Placeholder intelligence data ─────────────────────────────────────────

const MISSION = {
  opportunityScore:    87,
  aiConfidence:        94,
  dailyRecommendation: "Focus on Quiet Luxury lifestyle content — trending +340% this week across your target demographic.",
  estimatedReach:      "2.4M",
};

const EXECUTIVE_SUMMARY = {
  opportunity: "Quiet Luxury Skincare is entering peak virality with a 72-hour window before saturation. Your account demographics align with 94% of the engaged audience segment.",
  risks: [
    "Competitor @LuxuryLifeDaily publishing high-volume content (12+ posts/day)",
    "Saturday engagement historically drops 18% — adjust post timing to 11 AM",
  ],
  recommendation: "Publish one long-form hook video today targeting the Quiet Luxury morning routine niche. Follow with a Vault-sourced caption optimized for saves.",
  expectedPerformance: "Top 8% of your content category this week based on current trend velocity.",
};

const PRIORITY_QUEUE = [
  { id: 1, task: "Publish luxury morning routine hook",     priority: "HIGH",   eta: "45 min",  done: false, href: "/content-pack" },
  { id: 2, task: "Schedule 3 Quiet Luxury posts for Sat",  priority: "HIGH",   eta: "30 min",  done: false, href: "/calendar"     },
  { id: 3, task: "Analyse top competitor posts this week", priority: "MEDIUM", eta: "20 min",  done: false, href: "/competitors"  },
  { id: 4, task: "Update Vault with new hook templates",   priority: "MEDIUM", eta: "15 min",  done: false, href: "/vault"        },
  { id: 5, task: "Review niche opportunity report",        priority: "LOW",    eta: "10 min",  done: false, href: "/niche"        },
];

const OPPORTUNITY_RADAR = {
  niche:       "Quiet Luxury Skincare",
  growth:      "+340%",
  competition: "Low",
  confidence:  94,
  saturation:  "28%",
};

const COMPETITOR_SUMMARY =
  "@LuxuryLifeDaily gained +120K followers this week by doubling posting frequency. Their top video (4.2M views) focused on morning routine routines — your exact niche. AI recommends responding with a differentiated angle: focus on minimalism and product curation vs. their volume-first approach.";

const CONTENT_RECS = [
  {
    type:    "Today's Hook",
    icon:    Lightbulb,
    content: "POV: You found the skincare routine that Silicon Valley billionaires actually use — and it costs less than your daily coffee.",
    color:   "text-primary",
  },
  {
    type:    "Today's Caption",
    icon:    Sparkles,
    content: "Quiet luxury isn't about logos. It's about knowing what to use — and what to leave behind. Here's what's actually on my shelf. 🖤",
    color:   "text-chart-2",
  },
  {
    type:    "Today's Prompt",
    icon:    BrainCircuit,
    content: "Write a TikTok caption for a 60-second 'Get Ready With Me' video focused on a 3-step minimalist skincare routine. Tone: aspirational but accessible. End with a strong CTA for saves.",
    color:   "text-chart-5",
  },
  {
    type:    "Today's Hashtags",
    icon:    Hash,
    content: "#QuietLuxury #LuxurySkincare #MinimalistBeauty #CleanGirl #SkincareTok #LuxuryLifestyle #MorningRoutine",
    color:   "text-emerald-400",
  },
  {
    type:    "Music Mood",
    icon:    Music2,
    content: "Soft ambient piano or lo-fi beats — no vocals. BPM 70–85. Reference: 'Aesthetic Morning' playlist on Spotify. Avoid trending audio with vocal hooks.",
    color:   "text-amber-400",
  },
  {
    type:    "Thumbnail Idea",
    icon:    Image,
    content: "Flat lay of 4 skincare products on a white marble surface, natural light, gold accents. Text overlay in serif font: 'The Edit' — no clutter.",
    color:   "text-chart-4",
  },
  {
    type:    "CTA",
    icon:    Megaphone,
    content: "Save this if you're upgrading your routine in 2026. Drop a 🖤 if you want Part 2.",
    color:   "text-primary",
  },
];

const MARKET_INTEL = [
  { headline: "Quiet Luxury searches up 340% this week",           detail: "Google Trends + TikTok data",            time: "2h ago",  type: "surge"  },
  { headline: "Saturday 11 AM now peak engagement window",         detail: "Based on your last 30 days",             time: "4h ago",  type: "timing" },
  { headline: "Competitor @LuxuryLifeDaily: 120K new followers",   detail: "Morning routine content driving growth", time: "5h ago",  type: "threat" },
  { headline: "Minimalist skincare keyword CPC dropped 22%",       detail: "Opportunity window before competition",  time: "8h ago",  type: "opp"    },
  { headline: "New TikTok algorithm boost for 60–90s format",      detail: "AI-detected pattern across top creators",time: "12h ago", type: "algo"   },
];

const INTEL_COLORS: Record<string, string> = {
  surge:  "text-primary",
  timing: "text-emerald-400",
  threat: "text-red-400",
  opp:    "text-chart-2",
  algo:   "text-chart-5",
};

const INTEL_DOTS: Record<string, string> = {
  surge:  "bg-primary",
  timing: "bg-emerald-400",
  threat: "bg-red-400",
  opp:    "bg-chart-2",
  algo:   "bg-chart-5",
};

const PERFORMANCE_FORECAST = [
  { label: "Expected Reach",    value: "2.4M",  icon: Eye,           change: "+18%",  positive: true  },
  { label: "Expected Shares",   value: "18.2K", icon: Share2,        change: "+34%",  positive: true  },
  { label: "Expected Saves",    value: "34.8K", icon: Bookmark,      change: "+52%",  positive: true  },
  { label: "Expected Comments", value: "12.1K", icon: MessageCircle, change: "+9%",   positive: true  },
  { label: "Viral Probability", value: "73%",   icon: Flame,         change: "+8pts", positive: true  },
];

const AI_DECISIONS = [
  { action: "Publish hook video today at 11 AM",            confidence: 94, impact: "HIGH",   icon: Zap      },
  { action: "Avoid posting between 2–5 PM on weekdays",    confidence: 88, impact: "MEDIUM", icon: Clock    },
  { action: "Use Quiet Luxury hashtag cluster this week",  confidence: 91, impact: "HIGH",   icon: Hash     },
  { action: "Respond to competitor with minimalist angle", confidence: 79, impact: "MEDIUM", icon: Shield   },
  { action: "Schedule 2 Vault posts for Saturday 11 AM",  confidence: 96, impact: "HIGH",   icon: Star     },
];

const GROWTH_SCORE = 81;

// ── Sub-components ────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGH:   "bg-primary/20 text-primary border-primary/30",
    MEDIUM: "bg-amber-400/15 text-amber-400 border-amber-400/30",
    LOW:    "bg-muted/30 text-muted-foreground border-border",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${styles[priority] ?? styles.LOW}`}>
      {priority}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const styles: Record<string, string> = {
    HIGH:   "text-primary",
    MEDIUM: "text-amber-400",
    LOW:    "text-muted-foreground",
  };
  return (
    <span className={`text-[10px] font-mono uppercase ${styles[impact] ?? ""}`}>{impact}</span>
  );
}

function GrowthGauge({ score }: { score: number }) {
  const r   = 54;
  const circ = 2 * Math.PI * r;
  const half  = circ / 2;
  const fill  = (score / 100) * half;

  const color =
    score >= 80 ? "hsl(44 54% 54%)"
    : score >= 60 ? "hsl(38 92% 50%)"
    : "hsl(0 72% 51%)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="140" height="80" viewBox="0 0 140 80">
          {/* Track */}
          <path
            d="M 14 70 A 56 56 0 0 1 126 70"
            fill="none"
            stroke="hsl(44 54% 54% / 0.12)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 14 70 A 56 56 0 0 1 126 70"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${fill} ${half}`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pb-1">
          <span className="text-3xl font-bold font-serif luxury-gradient-text leading-none">{score}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <div className="flex gap-4 text-center">
        <div><p className="text-[10px] text-muted-foreground">Momentum</p><p className="text-xs font-mono text-primary">Strong ↑</p></div>
        <div><p className="text-[10px] text-muted-foreground">Trend</p><p className="text-xs font-mono text-emerald-400">+6 pts</p></div>
        <div><p className="text-[10px] text-muted-foreground">Rank</p><p className="text-xs font-mono text-chart-2">Top 12%</p></div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ExecutiveBrief() {
  const { user }   = useAuth();
  const [, navigate] = useLocation();
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [editingRec, setEditingRec]         = useState<number | null>(null);
  const [aiBrief, setAiBrief]               = useState<BriefResult | null>(null);
  const [briefLoading, setBriefLoading]     = useState(false);
  const [briefError, setBriefError]         = useState<string | null>(null);

  const { data: trendSummary, loading: trendLoading } = useTrendSummary();
  const { data: redditSummary }                       = useRedditSummary();

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const result = await aiService.generateExecutiveBrief("Quiet Luxury Lifestyle");
      setAiBrief(result);
    } catch (err: any) {
      setBriefError(String(err?.message ?? "Generation failed. Please try again."));
    } finally {
      setBriefLoading(false);
    }
  }, []);

  const displayName = user?.email
    ? user.email.split("@")[0]!.replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    : "Creator";

  const toggleTask = (id: number) =>
    setCompletedTasks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id],
    );

  const completedCount = completedTasks.length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* ── 1. Greeting Banner ── */}
      <div className="luxury-card p-6 border-primary/25 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-primary/60" />
              <p className="text-[10px] uppercase tracking-widest text-primary/70">{getGreeting()}</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif luxury-gradient-text tracking-tight mb-0.5">
              {displayName}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Executive Brief · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Opportunity</p>
              <p className="text-2xl font-bold font-serif luxury-gradient-text">{MISSION.opportunityScore}</p>
              <p className="text-[10px] text-primary font-mono">/ 100</p>
            </div>
            <div className="h-12 w-[1px] bg-border" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">AI Confidence</p>
              <p className="text-2xl font-bold font-serif text-emerald-400">{MISSION.aiConfidence}%</p>
              <p className="text-[10px] text-emerald-400/60 font-mono">High</p>
            </div>
            <div className="h-12 w-[1px] bg-border" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Est. Reach</p>
              <p className="text-2xl font-bold font-serif text-chart-2">{MISSION.estimatedReach}</p>
              <p className="text-[10px] text-chart-2/60 font-mono">Today</p>
            </div>
          </div>
        </div>
        {/* Daily Recommendation */}
        <div className="mt-5 pt-4 border-t border-border flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-primary/15 flex-shrink-0 mt-0.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Daily Recommendation</p>
            <p className="text-sm text-foreground">{MISSION.dailyRecommendation}</p>
          </div>
        </div>
        {/* ── Trend Intelligence ── */}
        {(trendSummary || trendLoading) && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3 w-3 text-chart-2" />
              <p className="text-[10px] uppercase tracking-widest text-chart-2/70">Live Trend Intelligence</p>
              {trendLoading && <RefreshCw className="h-3 w-3 text-muted-foreground/40 animate-spin ml-auto" />}
              {trendSummary && (
                <span className="ml-auto text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                  Google Trends · {trendSummary.source}
                </span>
              )}
            </div>
            {trendSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Top Trending</p>
                  <p className="text-xs font-semibold text-foreground truncate" title={trendSummary.topTrendingTopic}>
                    {trendSummary.topTrendingTopic}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Trend Score</p>
                  <p className="text-xs font-bold font-mono luxury-gradient-text">
                    {trendSummary.trendScore}
                    <span className="text-muted-foreground/50 text-[9px] font-normal">/100</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Direction</p>
                  <p className={`text-xs font-semibold font-mono ${
                    trendSummary.growthDirection === "up"   ? "text-emerald-400" :
                    trendSummary.growthDirection === "down" ? "text-red-400"     : "text-muted-foreground"
                  }`}>
                    {trendSummary.growthDirection === "up"
                      ? "↑ Rising"
                      : trendSummary.growthDirection === "down"
                      ? "↓ Falling"
                      : "→ Stable"}
                  </p>
                </div>
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Opportunity</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                    {trendSummary.opportunitySummary}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── Community Pulse ── */}
        {redditSummary && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-3 w-3 text-chart-5" />
              <p className="text-[10px] uppercase tracking-widest text-chart-5/70">Community Pulse</p>
              <span className="ml-auto text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                Reddit · {redditSummary.source}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Sentiment</p>
                <p className={`text-xs font-semibold font-mono ${
                  redditSummary.sentiment.overall === "positive" ? "text-emerald-400"
                  : redditSummary.sentiment.overall === "negative" ? "text-red-400"
                  : "text-muted-foreground"
                }`}>
                  {redditSummary.sentiment.label}
                  <span className="text-[9px] text-muted-foreground/50 font-normal ml-1">
                    {redditSummary.sentiment.positive}% pos
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Discussion Volume</p>
                <p className="text-xs font-bold font-mono text-chart-5">
                  {redditSummary.discussionVolume.toLocaleString()}
                  <span className="text-muted-foreground/50 text-[9px] font-normal"> comments</span>
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Fastest Growing Topic</p>
                <p className="text-xs font-semibold text-foreground truncate capitalize">
                  {redditSummary.fastestGrowingTopic}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Executive Summary ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Executive Summary</h2>
          <button
            onClick={generateBrief}
            disabled={briefLoading}
            className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            {briefLoading
              ? <><RefreshCw className="h-3 w-3 animate-spin" /> Generating…</>
              : <><BrainCircuit className="h-3 w-3" /> {aiBrief ? "Regenerate" : "Generate AI Brief"}</>}
          </button>
        </div>
        {briefError && (
          <p className="mb-4 text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2">{briefError}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opportunity */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Today's Opportunity</p>
            <p className="text-sm text-foreground leading-relaxed">{aiBrief?.opportunity ?? EXECUTIVE_SUMMARY.opportunity}</p>
          </div>
          {/* Risks */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-red-400/70">Risks</p>
            {(aiBrief?.risks ?? EXECUTIVE_SUMMARY.risks).map((risk, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{risk}</p>
              </div>
            ))}
          </div>
          {/* AI Recommendation */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-emerald-400/70">AI Recommendation</p>
            <p className="text-sm text-foreground leading-relaxed">{aiBrief?.recommendation ?? EXECUTIVE_SUMMARY.recommendation}</p>
          </div>
          {/* Expected Performance */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-chart-2/70">Expected Performance</p>
            <p className="text-sm text-foreground leading-relaxed">{EXECUTIVE_SUMMARY.expectedPerformance}</p>
          </div>
        </div>
      </div>

      {/* ── 3. Priority Queue + Opportunity Radar (2/3 + 1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Priority Queue */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Priority Queue</h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {completedCount}/{PRIORITY_QUEUE.length} Complete
            </span>
          </div>
          <div className="space-y-3">
            {PRIORITY_QUEUE.map(item => {
              const done = completedTasks.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${done ? "border-border/40 bg-muted/10 opacity-60" : "border-border hover:border-primary/30 hover:bg-primary/3"}`}
                >
                  <button onClick={() => toggleTask(item.id)} className="flex-shrink-0">
                    {done
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.task}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground font-mono">{item.eta}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={item.priority} />
                    <button
                      onClick={() => navigate(item.href)}
                      className="p-1.5 rounded-md border border-border hover:border-primary/40 hover:bg-primary/10 transition-all"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / PRIORITY_QUEUE.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Opportunity Radar */}
        <div className="luxury-card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Opportunity Radar</h2>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Highest Opportunity</p>
              <p className="text-base font-semibold font-serif text-foreground leading-tight">{OPPORTUNITY_RADAR.niche}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Growth</p>
                <p className="text-lg font-bold font-mono text-primary">{OPPORTUNITY_RADAR.growth}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Competition</p>
                <p className="text-lg font-bold font-mono text-emerald-400">{OPPORTUNITY_RADAR.competition}</p>
              </div>
              <div className="p-3 rounded-lg bg-chart-2/5 border border-chart-2/15">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Confidence</p>
                <p className="text-lg font-bold font-mono text-chart-2">{OPPORTUNITY_RADAR.confidence}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Saturation</p>
                <p className="text-lg font-bold font-mono text-foreground">{OPPORTUNITY_RADAR.saturation}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/content-pack")}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-semibold uppercase tracking-widest min-h-[44px]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Campaign
          </button>
        </div>
      </div>

      {/* ── 4. Competitor Intelligence ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Competitor Intelligence</h2>
          </div>
          <button
            onClick={() => navigate("/competitors")}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View Full Analysis <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{COMPETITOR_SUMMARY}</p>
      </div>

      {/* ── 5. AI Content Recommendations ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Content Recommendations</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">Today's Brief</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CONTENT_RECS.map((rec, i) => {
            const isEditing   = editingRec === i;
            const aiContent   = aiBrief?.contentRecs[i]?.content;
            const displayText = aiContent ?? rec.content;
            const isAi        = Boolean(aiContent);
            return (
              <div
                key={i}
                className={`p-4 rounded-lg border transition-all bg-black/20 group ${isAi ? "border-primary/30 bg-primary/3" : "border-border hover:border-primary/25"}`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <rec.icon className={`h-3.5 w-3.5 ${rec.color}`} />
                    <p className={`text-[10px] uppercase tracking-widest font-semibold ${rec.color}`}>{rec.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAi && (
                      <span className="text-[8px] font-mono uppercase tracking-widest text-primary/60 border border-primary/20 px-1.5 py-0.5 rounded">
                        AI
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate("/generator")}
                        className="p-1.5 rounded border border-border hover:border-primary/40 hover:bg-primary/10 transition-all"
                        title="Generate new"
                      >
                        <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                      <button
                        onClick={() => setEditingRec(isEditing ? null : i)}
                        className="p-1.5 rounded border border-border hover:border-primary/40 hover:bg-primary/10 transition-all"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{displayText}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Market Intelligence + Performance Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* AI Market Intelligence Feed */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Market Intelligence</h2>
          </div>
          <div className="space-y-4">
            {MARKET_INTEL.map((item, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${INTEL_DOTS[item.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${INTEL_COLORS[item.type]}`}>{item.headline}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.detail}</p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/40 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Forecast */}
        <div className="luxury-card p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Performance Forecast</h2>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Next 24h</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {PERFORMANCE_FORECAST.map((item, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-black/20 hover:border-primary/25 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className={`text-[10px] font-mono ${item.positive ? "text-emerald-400" : "text-red-400"}`}>
                    {item.change}
                  </span>
                </div>
                <p className="text-xl font-bold font-serif text-foreground">{item.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Viral Probability accent */}
          <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-4">
            <Flame className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Viral Probability</p>
              <p className="text-2xl font-bold font-serif luxury-gradient-text">73%</p>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: "73%" }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Above 92% of your recent posts</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. AI Decisions + Executive Growth Score ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* AI Decisions Panel */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Decisions</h2>
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">Recommended Actions</span>
          </div>
          <div className="space-y-3">
            {AI_DECISIONS.map((decision, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/3 transition-all group"
              >
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <decision.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{decision.action}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">AI Confidence: {decision.confidence}%</span>
                    <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${decision.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <ImpactBadge impact={decision.impact} />
                  <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Impact</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive Growth Score */}
        <div className="luxury-card p-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-5 self-start">
            <Gauge className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Growth Score</h2>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full gap-6">
            <GrowthGauge score={GROWTH_SCORE} />

            <div className="w-full space-y-2">
              {[
                { label: "Content Quality", value: 88 },
                { label: "Posting Consistency", value: 72 },
                { label: "Niche Authority", value: 81 },
                { label: "Engagement Rate", value: 79 },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    <span className="font-mono text-primary">{item.value}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-700"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
