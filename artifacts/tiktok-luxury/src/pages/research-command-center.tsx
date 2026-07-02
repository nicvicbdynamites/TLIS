import {
  Globe, TrendingUp, MessageSquare, Play, Grid2X2,
  Camera, Newspaper, Gem, Search, Download,
  FileText, Database, Bot, Send, Sparkles,
  Hash, BarChart2, Activity, Users, AlertCircle,
  Clock, Lock, CheckCircle2, ExternalLink,
  ArrowRight, Zap, Lightbulb, RefreshCw, Plus,
  X, Flame, BookOpen, ChevronRight, BrainCircuit,
  Radio, Target, Star,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { aiService } from "@/lib/ai-provider";

// ── Placeholder data ──────────────────────────────────────────────────────

const RESEARCH_SUMMARY = {
  trendingNiche:      "Quiet Luxury Skincare",
  highestOpportunity: "Morning Routine Rituals",
  lowestCompetition:  "Luxury Fragrance Layering",
  aiConfidence:       91,
  contentPotential:   "3.2M – 5.8M",
};

const TREND_SOURCES = [
  { name: "Google Trends",       status: "Ready",          lastUpdated: "5 min ago",  confidence: 96, icon: Globe        },
  { name: "TikTok Trends",       status: "Ready",          lastUpdated: "12 min ago", confidence: 94, icon: TrendingUp   },
  { name: "Reddit Insights",     status: "Ready",          lastUpdated: "2h ago",     confidence: 78, icon: MessageSquare},
  { name: "YouTube Trends",      status: "Ready",          lastUpdated: "1h ago",     confidence: 82, icon: Play         },
  { name: "Pinterest Trends",    status: "Connected Soon", lastUpdated: "—",          confidence: 0,  icon: Grid2X2      },
  { name: "Instagram Trends",    status: "Connected Soon", lastUpdated: "—",          confidence: 0,  icon: Camera       },
  { name: "Luxury News",         status: "Ready",          lastUpdated: "30 min ago", confidence: 88, icon: Newspaper    },
  { name: "Fashion Intelligence",status: "Ready",          lastUpdated: "1h ago",     confidence: 85, icon: Gem          },
];

const OPPORTUNITY_SECTIONS = [
  {
    label: "Emerging Niches",
    icon: Sparkles,
    color: "text-primary",
    dot: "bg-primary",
    items: [
      { name: "Quiet Luxury Skincare",     opp: 94, conf: 91 },
      { name: "Old-Money Aesthetic",       opp: 88, conf: 87 },
      { name: "Luxury Travel Micro-Vlogs", opp: 82, conf: 79 },
      { name: "Investment Wardrobe",       opp: 76, conf: 83 },
    ],
  },
  {
    label: "Rising Keywords",
    icon: Search,
    color: "text-chart-2",
    dot: "bg-chart-2",
    items: [
      { name: "quiet luxury skincare",  opp: 91, conf: 93 },
      { name: "old money morning",      opp: 87, conf: 88 },
      { name: "luxury minimalist home", opp: 79, conf: 82 },
      { name: "investment bag 2026",    opp: 74, conf: 77 },
    ],
  },
  {
    label: "Rising Hashtags",
    icon: Hash,
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    items: [
      { name: "#QuietLuxury",       opp: 97, conf: 95 },
      { name: "#LuxurySkincare",    opp: 89, conf: 91 },
      { name: "#OldMoneyVibes",     opp: 84, conf: 86 },
      { name: "#MinimalistLuxury",  opp: 77, conf: 80 },
    ],
  },
  {
    label: "Luxury Behaviors",
    icon: Star,
    color: "text-amber-400",
    dot: "bg-amber-400",
    items: [
      { name: "Morning skincare rituals",  opp: 90, conf: 88 },
      { name: "Wardrobe curation edits",  opp: 85, conf: 83 },
      { name: "Silent luxury dining",     opp: 79, conf: 75 },
      { name: "Capsule collection builds",opp: 72, conf: 71 },
    ],
  },
  {
    label: "Audience Interests",
    icon: Target,
    color: "text-chart-5",
    dot: "bg-chart-5",
    items: [
      { name: "Skincare & Wellness",     opp: 93, conf: 90 },
      { name: "Fashion & Style",         opp: 88, conf: 86 },
      { name: "Travel & Lifestyle",      opp: 81, conf: 79 },
      { name: "Investment & Finance",    opp: 74, conf: 70 },
    ],
  },
];

type FeedType = "movement" | "frequency" | "viral" | "niche" | "alert";

const COMPETITOR_FEED: {
  competitor: string;
  event: string;
  detail: string;
  time: string;
  type: FeedType;
}[] = [
  { competitor: "@LuxuryLifeDaily",  event: "New viral video",          detail: "4.2M views on morning routine content — your niche",  time: "2h ago",  type: "viral"     },
  { competitor: "@TheRealLuxe",      event: "Posting frequency surge",  detail: "Publishing 8–10 posts/day this week",                 time: "4h ago",  type: "frequency" },
  { competitor: "@GlossyElite",      event: "New niche entry",          detail: "Entered Luxury Fragrance Layering with 3 posts",      time: "6h ago",  type: "niche"     },
  { competitor: "@LuxuryLifeDaily",  event: "Account movement",         detail: "+43K followers this week from trending content",      time: "8h ago",  type: "movement"  },
  { competitor: "@MinimalLux",       event: "Viral alert",              detail: "2.1M views — capsule wardrobe curation video",        time: "10h ago", type: "viral"     },
  { competitor: "@EliteCreator",     event: "New niche discovery",      detail: "Testing 'Investment Bag' content — 5 posts live",     time: "1d ago",  type: "niche"     },
  { competitor: "@TheRealLuxe",      event: "Account movement",         detail: "Switched primary posting time to 11 AM Saturday",    time: "1d ago",  type: "movement"  },
  { competitor: "@GlossyElite",      event: "Viral alert",              detail: "1.7M views on Hermès haul — unexpected breakout",    time: "2d ago",  type: "alert"     },
];

const FEED_COLORS: Record<FeedType, string> = {
  viral:     "text-primary",
  frequency: "text-red-400",
  niche:     "text-chart-2",
  movement:  "text-emerald-400",
  alert:     "text-amber-400",
};

const FEED_DOTS: Record<FeedType, string> = {
  viral:     "bg-primary",
  frequency: "bg-red-400",
  niche:     "bg-chart-2",
  movement:  "bg-emerald-400",
  alert:     "bg-amber-400",
};

const FEED_ICONS: Record<FeedType, typeof Flame> = {
  viral:     Flame,
  frequency: Activity,
  niche:     Lightbulb,
  movement:  Users,
  alert:     AlertCircle,
};

const INITIAL_KEYWORDS = [
  { word: "quiet luxury skincare",      difficulty: 38, opp: 91, volume: "480K", trend: "up"   },
  { word: "old money morning routine",  difficulty: 24, opp: 88, volume: "210K", trend: "up"   },
  { word: "luxury minimalist lifestyle",difficulty: 45, opp: 79, volume: "320K", trend: "up"   },
  { word: "investment bag review 2026", difficulty: 31, opp: 74, volume: "95K",  trend: "flat" },
  { word: "silent luxury aesthetic",    difficulty: 19, opp: 83, volume: "180K", trend: "up"   },
  { word: "luxury fragrance layering",  difficulty: 12, opp: 86, volume: "62K",  trend: "up"   },
];

const AI_ACTIONS = [
  { label: "Research Topic",        icon: Search,       desc: "Deep-dive a niche or topic for content opportunities" },
  { label: "Find Competitors",      icon: Users,        desc: "Discover and analyse competitors in your niche"       },
  { label: "Generate Market Report",icon: FileText,     desc: "Full AI market report with trends and insights"       },
  { label: "Analyse Audience",      icon: BarChart2,    desc: "Profile your ideal audience and their behaviours"     },
  { label: "Discover Content Gaps", icon: Lightbulb,   desc: "Find underserved content opportunities in your niche"  },
];

const FUTURE_INTEGRATIONS = [
  { name: "Google Trends API",      icon: Globe,        category: "Data"     },
  { name: "Reddit API",             icon: MessageSquare,category: "Social"   },
  { name: "Ahrefs",                 icon: BarChart2,    category: "SEO"      },
  { name: "SEMrush",                icon: TrendingUp,   category: "SEO"      },
  { name: "Exploding Topics",       icon: Flame,        category: "Trends"   },
  { name: "Google Search Console",  icon: Search,       category: "Data"     },
  { name: "TikTok Research API",    icon: Play,         category: "Social"   },
];

// ── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const ready = status === "Ready";
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${
      ready
        ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
        : "bg-muted/20 text-muted-foreground border-border"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
      {status}
    </span>
  );
}

function ConfidenceBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function DifficultyBadge({ value }: { value: number }) {
  const label = value < 25 ? "Easy" : value < 45 ? "Medium" : "Hard";
  const style  = value < 25
    ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
    : value < 45
    ? "bg-amber-400/10 text-amber-400 border-amber-400/25"
    : "bg-red-400/10 text-red-400 border-red-400/25";
  return (
    <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${style}`}>
      {label} {value}
    </span>
  );
}

function TrendArrow({ direction }: { direction: string }) {
  if (direction === "up")   return <span className="text-xs text-emerald-400 font-mono">↑</span>;
  if (direction === "down") return <span className="text-xs text-red-400 font-mono">↓</span>;
  return <span className="text-xs text-muted-foreground font-mono">→</span>;
}

const AI_PLACEHOLDER_RESPONSES: Record<string, string> = {
  "Research Topic": `**Quiet Luxury Skincare — Deep Research**\n\nTrend velocity: +340% (7-day rolling avg)\nPeak window: 72 hours remaining before saturation.\n\nTop creators: @LuxuryLifeDaily, @MinimalLux, @GlossyElite\nContent angle gap: Product curation vs. ingredient education — low competition.\n\nAI Recommendation: Publish a 60-second curation video focusing on 3 hero products. Prioritise saves over views for long-term algorithm signal.`,
  "Find Competitors": `**Competitor Analysis — Quiet Luxury Niche**\n\n1. @LuxuryLifeDaily — 2.1M followers, 8–12 posts/day, Morning Routine focus\n2. @MinimalLux — 890K followers, 3–5 posts/day, Capsule wardrobe focus\n3. @GlossyElite — 450K followers, 5–7 posts/day, Mixed luxury content\n\nGap identified: None of the top 3 creators focus on fragrance layering — lowest competition opportunity in the niche.`,
  "Generate Market Report": `**Market Report — Luxury Lifestyle TikTok**\n\nMarket size: 18.4M monthly active viewers in the Quiet Luxury segment.\nGrowth rate: +67% YoY\nMonetisation potential: £8,200–£24,000/month at 500K followers in this niche.\n\nTop performing formats: Get Ready With Me (34%), Product Reviews (28%), Day-in-the-life (22%)\n\nAlgorithm signals: Saves > Comments > Shares for this category. Long-form (55–75s) outperforms short-form by 2.4x in average watch time.`,
  "Analyse Audience": `**Audience Profile — Quiet Luxury Segment**\n\nDemographics: 78% Female · 22% Male\nAge: 22–38 (primary), 18–22 (secondary)\nGeography: UK 34%, US 28%, AU 14%, CA 12%\nIncome bracket: £45K–£120K household income\n\nPsychographics: Values authenticity, minimalism, investment thinking. Aspires to timeless style over trend-driven purchases.\n\nPeak engagement times: 11 AM Sat/Sun, 7 PM Tue/Thu`,
  "Discover Content Gaps": `**Content Gap Analysis — Your Niche**\n\n🟡 Luxury Fragrance Layering — 12% saturation, 86/100 opportunity\nNo creator in your space has built a series format for this.\n\n🟡 Investment Bag Authentication — 19% saturation, 81/100 opportunity\nHigh search volume (95K/mo), low creator supply.\n\n🟢 Quiet Luxury Home Essentials — 8% saturation, 79/100 opportunity\nCrosses into interior design audience — high share potential.`,
};

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ResearchCommandCenter() {
  const [, navigate] = useLocation();

  const [keywordSearch, setKeywordSearch] = useState("");
  const [savedKeywords, setSavedKeywords] = useState(INITIAL_KEYWORDS);
  const [newKeyword, setNewKeyword]       = useState("");

  const [aiQuery, setAiQuery]             = useState("");
  const [activeAction, setActiveAction]   = useState<string | null>(null);
  const [aiOutput, setAiOutput]           = useState<string | null>(null);
  const [aiLoading, setAiLoading]         = useState(false);

  const filteredKeywords = savedKeywords.filter(k =>
    k.word.toLowerCase().includes(keywordSearch.toLowerCase()),
  );

  const handleAiAction = useCallback(async (label: string) => {
    setActiveAction(label);
    setAiLoading(true);
    setAiOutput(null);
    try {
      const result = await aiService.generateResearch(label, "Quiet Luxury Lifestyle");
      const formatted = [
        `**${label}**\n`,
        result.summary,
        result.insights.length      ? `\nInsights:\n${result.insights.map(i => `• ${i}`).join("\n")}` : "",
        result.opportunities.length ? `\nOpportunities:\n${result.opportunities.map(o => `• ${o}`).join("\n")}` : "",
        result.risks.length         ? `\nRisks:\n${result.risks.map(r => `• ${r}`).join("\n")}` : "",
        `\nAI Confidence: ${result.confidence}%  ·  Model: ${result.model}`,
      ].filter(Boolean).join("\n");
      setAiOutput(formatted);
    } catch {
      setAiOutput(AI_PLACEHOLDER_RESPONSES[label] ?? "AI analysis complete.");
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleCustomQuery = useCallback(async () => {
    if (!aiQuery.trim()) return;
    const query = aiQuery.trim();
    setActiveAction("Custom");
    setAiLoading(true);
    setAiOutput(null);
    try {
      const result = await aiService.generateResearch(query, "Quiet Luxury Lifestyle");
      const formatted = [
        `**Custom Research: "${query}"**\n`,
        result.summary,
        result.insights.length      ? `\nInsights:\n${result.insights.map(i => `• ${i}`).join("\n")}` : "",
        result.opportunities.length ? `\nOpportunities:\n${result.opportunities.map(o => `• ${o}`).join("\n")}` : "",
        result.risks.length         ? `\nRisks:\n${result.risks.map(r => `• ${r}`).join("\n")}` : "",
        `\nAI Confidence: ${result.confidence}%  ·  Model: ${result.model}`,
      ].filter(Boolean).join("\n");
      setAiOutput(formatted);
      setAiQuery("");
    } catch {
      setAiOutput(`**Custom Research: "${query}"**\n\nGeneration failed. Please try again.`);
    } finally {
      setAiLoading(false);
    }
  }, [aiQuery]);

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || savedKeywords.some(k => k.word === trimmed)) return;
    setSavedKeywords(prev => [
      { word: trimmed, difficulty: Math.floor(Math.random() * 60) + 10, opp: Math.floor(Math.random() * 40) + 55, volume: "—", trend: "flat" },
      ...prev,
    ]);
    setNewKeyword("");
  };

  const removeKeyword = (word: string) =>
    setSavedKeywords(prev => prev.filter(k => k.word !== word));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-4 w-4 text-primary/60" />
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Intelligence Platform</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif luxury-gradient-text tracking-tight">
            Research Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Market intelligence · Trend discovery · Competitor analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Intel
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Executive Research Summary ── */}
      <div className="luxury-card p-6 border-primary/25 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
        <div className="flex items-center gap-2 mb-5">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Executive Research Summary</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">AI · Live</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg border border-primary/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Trending Niche</p>
            <p className="text-sm font-semibold font-serif text-foreground leading-snug">{RESEARCH_SUMMARY.trendingNiche}</p>
            <div className="mt-2">
              <ConfidenceBar value={94} />
            </div>
          </div>
          <div className="p-4 rounded-lg border border-chart-2/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Highest Opportunity</p>
            <p className="text-sm font-semibold font-serif text-foreground leading-snug">{RESEARCH_SUMMARY.highestOpportunity}</p>
            <div className="mt-2">
              <ConfidenceBar value={91} color="bg-chart-2" />
            </div>
          </div>
          <div className="p-4 rounded-lg border border-emerald-400/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Lowest Competition</p>
            <p className="text-sm font-semibold font-serif text-foreground leading-snug">{RESEARCH_SUMMARY.lowestCompetition}</p>
            <div className="mt-2">
              <ConfidenceBar value={86} color="bg-emerald-400" />
            </div>
          </div>
          <div className="p-4 rounded-lg border border-amber-400/20 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">AI Confidence</p>
            <p className="text-3xl font-bold font-serif luxury-gradient-text">{RESEARCH_SUMMARY.aiConfidence}%</p>
            <div className="mt-2">
              <ConfidenceBar value={RESEARCH_SUMMARY.aiConfidence} color="bg-amber-400" />
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Content Potential</p>
            <p className="text-sm font-bold font-mono text-primary leading-snug">{RESEARCH_SUMMARY.contentPotential}</p>
            <p className="text-[10px] text-muted-foreground mt-1">views / week</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Trend Sources ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Trend Sources</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {TREND_SOURCES.filter(s => s.status === "Ready").length}/{TREND_SOURCES.length} Connected
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TREND_SOURCES.map(source => {
            const ready = source.status === "Ready";
            return (
              <div
                key={source.name}
                className={`p-4 rounded-lg border transition-all ${ready ? "border-border hover:border-primary/30 hover:bg-primary/3" : "border-border/40 bg-muted/5 opacity-60"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <source.icon className="h-4 w-4 text-primary" />
                  </div>
                  <StatusBadge status={source.status} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-3">{source.name}</p>
                {ready ? (
                  <>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-mono text-primary">{source.confidence}%</span>
                    </div>
                    <ConfidenceBar value={source.confidence} />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-mono text-muted-foreground/60">{source.lastUpdated}</span>
                      <button className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-semibold">
                        Open <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 mt-2">Integration coming soon</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: Opportunity Discovery ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Opportunity Discovery</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {OPPORTUNITY_SECTIONS.map(section => (
            <div key={section.label} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <section.icon className={`h-3.5 w-3.5 ${section.color}`} />
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${section.color}`}>
                  {section.label}
                </p>
              </div>
              {section.items.map(item => (
                <div key={item.name} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-foreground font-medium truncate pr-2">{item.name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground">Conf {item.conf}%</span>
                      <span className={`text-[10px] font-mono font-bold ${section.color}`}>{item.opp}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-1">
                    <div className="flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${section.dot} rounded-full`}
                        style={{ width: `${item.opp}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: Competitor Intelligence Feed ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Competitor Intelligence Feed</h2>
          <span className="ml-auto">
            <button
              onClick={() => navigate("/competitors")}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Full Analysis <ArrowRight className="h-3 w-3" />
            </button>
          </span>
        </div>
        <div className="space-y-0">
          {COMPETITOR_FEED.map((item, i) => {
            const FeedIcon = FEED_ICONS[item.type];
            return (
              <div
                key={i}
                className="flex gap-4 pb-4 mb-4 border-b border-border last:border-0 last:pb-0 last:mb-0 group hover:bg-primary/2 -mx-2 px-2 py-2 rounded-lg transition-colors"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${FEED_DOTS[item.type]}/15 border border-current/${item.type}`}>
                    <FeedIcon className={`h-3.5 w-3.5 ${FEED_COLORS[item.type]}`} />
                  </div>
                  {i < COMPETITOR_FEED.length - 1 && (
                    <div className="h-full w-[1px] bg-border mt-1.5" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                    <span className={`text-sm font-semibold font-mono ${FEED_COLORS[item.type]}`}>{item.competitor}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-foreground font-medium">{item.event}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/40 flex-shrink-0 pt-0.5">{item.time}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 5: Keyword Research Workspace ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Keyword Research Workspace</h2>
        </div>

        {/* Search + Add */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Filter saved keywords…"
              value={keywordSearch}
              onChange={e => setKeywordSearch(e.target.value)}
              className="w-full bg-black/40 border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Add new keyword…"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddKeyword()}
              className="w-full bg-black/40 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            onClick={handleAddKeyword}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-semibold uppercase tracking-widest flex-shrink-0 min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-3 mb-2">
          {["Keyword", "Difficulty", "Opportunity", "Volume", "Trend", ""].map(h => (
            <p key={h} className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{h}</p>
          ))}
        </div>

        {/* Keyword rows */}
        <div className="space-y-2">
          {filteredKeywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No keywords found</div>
          ) : (
            filteredKeywords.map(kw => (
              <div
                key={kw.word}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 md:gap-4 items-center p-3 rounded-lg border border-border hover:border-primary/25 hover:bg-primary/3 transition-all"
              >
                <p className="text-sm text-foreground font-medium">{kw.word}</p>
                <DifficultyBadge value={kw.difficulty} />
                <div className="flex items-center gap-2 md:justify-center">
                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${kw.opp}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-primary w-6">{kw.opp}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{kw.volume}</span>
                <TrendArrow direction={kw.trend} />
                <button
                  onClick={() => removeKeyword(kw.word)}
                  className="p-1.5 rounded border border-border hover:border-red-400/40 hover:bg-red-400/5 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100 ml-auto"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 6: AI Research Assistant ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Research Assistant</h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">Gemini Ready</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action buttons + query */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => handleAiAction(action.label)}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                    activeAction === action.label
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <action.icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${activeAction === action.label ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-xs font-semibold ${activeAction === action.label ? "text-primary" : "text-foreground"}`}>
                      {action.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom query */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask the AI anything about your niche…"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && aiQuery.trim()) handleCustomQuery();
                }}
                className="flex-1 bg-black/40 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <button
                onClick={handleCustomQuery}
                className="p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/10 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Send className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* AI Output */}
          <div className="min-h-[200px] p-4 rounded-lg border border-border bg-black/30 flex flex-col">
            {aiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground font-mono">AI is thinking…</p>
              </div>
            ) : aiOutput ? (
              <div className="flex-1 overflow-auto">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">{activeAction}</p>
                  <button
                    onClick={() => { setAiOutput(null); setActiveAction(null); }}
                    className="ml-auto p-1 hover:bg-muted/20 rounded transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {aiOutput}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <BrainCircuit className="h-8 w-8 text-primary/20" />
                <p className="text-sm text-muted-foreground/60">Select an action or ask a custom question</p>
                <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-wider">AI output will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 7: Intelligence Export ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Intelligence Export</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 transition-all text-sm font-semibold text-primary min-h-[48px]">
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
          <button className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm font-semibold text-foreground min-h-[48px]">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Export Markdown
          </button>
          <button
            onClick={() => navigate("/vault")}
            className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm font-semibold text-foreground min-h-[48px]"
          >
            <Database className="h-4 w-4 text-muted-foreground" />
            Save to Intelligence Vault
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 font-mono mt-3 text-center">
          Export includes all visible sections · PDF export connects to server in a future release
        </p>
      </div>

      {/* ── SECTION 8: Future Integrations ── */}
      <div className="luxury-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-muted-foreground/60" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Future Integrations</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">These integrations will be enabled in upcoming releases.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {FUTURE_INTEGRATIONS.map(integration => (
            <div
              key={integration.name}
              className="p-4 rounded-lg border border-border/40 bg-muted/5 opacity-60 flex flex-col items-center text-center gap-2.5"
            >
              <div className="p-2 rounded-lg bg-muted/20">
                <integration.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium leading-snug">{integration.name}</p>
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mt-0.5">{integration.category}</p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-border/40 text-muted-foreground/40">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
