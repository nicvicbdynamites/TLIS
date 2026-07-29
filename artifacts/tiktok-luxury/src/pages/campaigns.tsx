import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Target, ShieldCheck, CalendarDays, Plus, Search, Filter,
  TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowRight,
  Sparkles, Layers, RefreshCw, BarChart2, Eye, Award, Zap
} from "lucide-react";
import { getCampaigns, type Campaign, getReviewCenterStats } from "@/lib/review-center-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CampaignManager() {
  const [, navigate] = useLocation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [stats, setStats] = useState(() => getReviewCenterStats());

  const loadData = () => {
    setCampaigns(getCampaigns());
    setStats(getReviewCenterStats());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("tlis_review_center_update", loadData);
    return () => window.removeEventListener("tlis_review_center_update", loadData);
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.targetAccount.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = campaigns.filter(c => ["Scheduled", "Publishing", "Published", "Awaiting Review"].includes(c.status)).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Header Banner */}
      <div className="luxury-card p-6 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Campaign Operations</span>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                {activeCount} Active Campaigns
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold luxury-gradient-text">
              Campaign Manager
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              End-to-end luxury campaign orchestration. Plan, review, schedule, and track performance of automated video campaigns across your accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/generator")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs gap-2 min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/review-center")}
              className="border-primary/30 hover:bg-primary/10 text-xs gap-2 min-h-[44px]"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Review Center ({stats.awaitingReview})
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign Operations Stats Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="luxury-card p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider">Total Campaigns</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-serif font-bold">{campaigns.length}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Across all workspaces</p>
        </div>

        <div className="luxury-card p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider">Awaiting Review</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-300">{stats.awaitingReview}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Requires human approval</p>
        </div>

        <div className="luxury-card p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between text-primary mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider">Scheduled Queue</span>
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-primary">{stats.scheduled}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Ready for auto-publish</p>
        </div>

        <div className="luxury-card p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Live / Published</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-300">{stats.published}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Active on TikTok</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns, niches, accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {["all", "Awaiting Review", "Scheduled", "Published", "Draft"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {status === "all" ? "All Statuses" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <div className="luxury-card p-12 text-center flex flex-col items-center justify-center gap-3">
            <Target className="h-10 w-10 text-muted-foreground/30" />
            <h3 className="text-base font-semibold">No campaigns found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Try updating your search query or create a new campaign from Content Studio.
            </p>
            <Button
              onClick={() => navigate("/generator")}
              className="mt-2 text-xs bg-primary text-primary-foreground"
            >
              Create Campaign
            </Button>
          </div>
        ) : (
          filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="luxury-card p-5 border-border/80 hover:border-primary/40 transition-all duration-200 group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-primary font-semibold">{camp.targetAccount}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">
                      {camp.niche}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${
                        camp.status === "Awaiting Review"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : camp.status === "Scheduled"
                          ? "bg-primary/20 text-primary border-primary/30"
                          : camp.status === "Published"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {camp.status}
                    </Badge>
                  </div>
                  <h3 className="text-base font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                    {camp.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {camp.content.caption}
                  </p>
                </div>

                <div className="flex items-center gap-6 justify-between lg:justify-end border-t lg:border-t-0 border-border pt-3 lg:pt-0">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">AI Confidence</span>
                      <span className="text-primary font-bold">{camp.aiConfidence}%</span>
                    </div>
                    {camp.metrics && (
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Views</span>
                        <span className="text-foreground font-bold">{camp.metrics.views.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/review-center?id=${camp.id}`)}
                      className="border-primary/30 hover:bg-primary/10 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      View Details
                    </Button>
                    {camp.status === "Awaiting Review" && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/review-center?id=${camp.id}`)}
                        className="bg-amber-500 hover:bg-amber-600 text-black text-xs gap-1 font-semibold"
                      >
                        Review Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
