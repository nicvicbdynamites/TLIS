import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, Clock, Sparkles, Filter, Search,
  Eye, RefreshCw, Trash2, Calendar, Send, ShieldCheck,
  ChevronLeft, Play, Pause, Layers, Sliders, Maximize2,
  Wand2, FileEdit, Star, AlertCircle, ArrowUpRight, Check,
  Image as ImageIcon, Film, Hash, Music, LayoutGrid, AlertTriangle,
  BadgeAlert, ArrowRight
} from "lucide-react";
import {
  loadCampaigns,
  saveCampaigns,
  getCampaignById,
  updateCampaign,
  approveCampaign,
  rejectCampaign,
  scheduleCampaign,
  publishCampaign,
  refineContentWithAI,
  getReviewCenterStats,
  type Campaign,
  type CampaignStatus,
  type ImageAsset,
  type VideoAsset,
  type CampaignContent
} from "@/lib/review-center-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<CampaignStatus, { color: string; bg: string; border: string }> = {
  "Draft":              { color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border" },
  "Researching":        { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  "Generating":         { color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  "Awaiting Review":    { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  "Approved":           { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  "Scheduled":          { color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  "Publishing":         { color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  "Published":          { color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/30" },
  "Analytics Complete": { color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/30" },
  "Archived":           { color: "text-muted-foreground/60", bg: "bg-muted/10", border: "border-border/40" },
  "Rejected":           { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ReviewCenterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal states
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Active video play state
  const [isPlayingVideo, setIsPlayingVideo] = useState<Record<string, boolean>>({});

  // Sync state
  const refreshCampaigns = () => {
    setCampaigns(loadCampaigns());
  };

  useEffect(() => {
    refreshCampaigns();

    // Check URL params for filter or campaign ID
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get("filter");
    const idParam = urlParams.get("id");

    if (filterParam) {
      setStatusFilter(filterParam);
    }
    if (idParam) {
      setSelectedCampaignId(idParam);
    }

    const handleUpdate = () => refreshCampaigns();
    window.addEventListener("tlis_review_center_update", handleUpdate);
    return () => window.removeEventListener("tlis_review_center_update", handleUpdate);
  }, []);

  const stats = useMemo(() => {
    return getReviewCenterStats();
  }, [campaigns]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesQuery = !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.targetAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.niche.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [campaigns, statusFilter, searchQuery]);

  // Campaign Editing state handlers
  const handleContentChange = (field: keyof CampaignContent, value: string) => {
    if (!selectedCampaign) return;
    const updatedContent = {
      ...selectedCampaign.content,
      [field]: field === "hashtags" ? value.split(/\s+/).filter(Boolean) : value
    };
    const updated = updateCampaign(selectedCampaign.id, { content: updatedContent });
    if (updated) {
      refreshCampaigns();
    }
  };

  const handleAiRefine = async (action: "improve" | "rewrite" | "luxury" | "viral" | "shorten" | "expand") => {
    if (!selectedCampaign) return;
    setIsAiProcessing(true);
    toast({
      title: "AI Optimization",
      description: `Refining content with ${action.toUpperCase()} preset...`,
    });

    try {
      const refined = await refineContentWithAI(selectedCampaign, action);
      updateCampaign(selectedCampaign.id, { content: refined });
      refreshCampaigns();
      toast({
        title: "Content Updated",
        description: `Successfully applied ${action} transformation.`,
      });
    } catch (err) {
      toast({
        title: "AI Refinement Failed",
        description: "Could not apply transformation.",
        variant: "destructive"
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleApprove = (id: string) => {
    approveCampaign(id);
    refreshCampaigns();
    toast({
      title: "Campaign Approved",
      description: "Campaign marked as approved and ready for scheduling.",
    });
  };

  const handleReject = () => {
    if (!selectedCampaign) return;
    rejectCampaign(selectedCampaign.id, rejectionReasonInput);
    refreshCampaigns();
    setRejectModalOpen(false);
    setRejectionReasonInput("");
    toast({
      title: "Campaign Rejected",
      description: "Campaign status updated to Rejected.",
    });
  };

  const handleScheduleConfirm = () => {
    if (!selectedCampaign) return;
    scheduleCampaign(selectedCampaign.id, scheduleDate);
    refreshCampaigns();
    setScheduleModalOpen(false);
    toast({
      title: "Campaign Scheduled",
      description: `Scheduled for ${new Date(scheduleDate).toLocaleString()} and sent to Content Calendar.`,
    });
  };

  const handlePublishNow = (id: string) => {
    publishCampaign(id);
    refreshCampaigns();
    toast({
      title: "Campaign Published!",
      description: "Campaign live on TikTok target account and pushed to Analytics.",
    });
  };

  const handleRegenerateAssets = (id: string) => {
    setIsAiProcessing(true);
    toast({
      title: "Regenerating Assets",
      description: "Generating fresh luxury images & media assets...",
    });
    setTimeout(() => {
      refreshCampaigns();
      setIsAiProcessing(false);
      toast({
        title: "Assets Regenerated",
        description: "Fresh high-converting visual assets generated.",
      });
    }, 1200);
  };

  const toggleImageApproval = (imageId: string) => {
    if (!selectedCampaign) return;
    const updatedImages = selectedCampaign.images.map(img =>
      img.id === imageId ? { ...img, approved: !img.approved } : img
    );
    updateCampaign(selectedCampaign.id, { images: updatedImages });
    refreshCampaigns();
  };

  const toggleVideoApproval = (videoId: string) => {
    if (!selectedCampaign) return;
    const updatedVideos = selectedCampaign.videos.map(vid =>
      vid.id === videoId ? { ...vid, approved: !vid.approved } : vid
    );
    updateCampaign(selectedCampaign.id, { videos: updatedVideos });
    refreshCampaigns();
  };

  const deleteImage = (imageId: string) => {
    if (!selectedCampaign) return;
    const updatedImages = selectedCampaign.images.filter(img => img.id !== imageId);
    updateCampaign(selectedCampaign.id, { images: updatedImages });
    refreshCampaigns();
    toast({ description: "Image asset removed from campaign." });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER DETAILED CAMPAIGN REVIEW VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (selectedCampaign) {
    const statusCfg = STATUS_COLORS[selectedCampaign.status];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-6 pb-12">
        {/* Top Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCampaignId(null)}
              className="p-2.5 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 text-xs font-medium"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Campaigns
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                  Review Center ID: {selectedCampaign.id}
                </span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border", statusCfg.color, statusCfg.bg, statusCfg.border)}>
                  {selectedCampaign.status}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-serif font-bold luxury-gradient-text mt-0.5">
                {selectedCampaign.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-mono font-semibold text-primary">
                {selectedCampaign.aiConfidence}% AI Confidence
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-secondary/30 border border-border text-xs text-muted-foreground">
              Account: <span className="font-semibold text-foreground">{selectedCampaign.targetAccount}</span>
            </div>
          </div>
        </div>

        {/* Campaign Action Bar */}
        <div className="luxury-card p-4 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Campaign Pipeline Stage: <strong className="text-foreground">{selectedCampaign.status}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRegenerateAssets(selectedCampaign.id)}
              disabled={isAiProcessing}
              className="px-3 py-2 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-medium text-foreground transition flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isAiProcessing && "animate-spin")} />
              Regenerate Assets
            </button>

            <button
              onClick={() => {
                updateCampaign(selectedCampaign.id, { status: "Draft" });
                refreshCampaigns();
                toast({ description: "Saved to drafts." });
              }}
              className="px-3 py-2 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 text-xs font-medium text-foreground transition"
            >
              Save Draft
            </button>

            {selectedCampaign.status !== "Approved" && selectedCampaign.status !== "Scheduled" && selectedCampaign.status !== "Published" && (
              <button
                onClick={() => handleApprove(selectedCampaign.id)}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Campaign
              </button>
            )}

            <button
              onClick={() => setScheduleModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-medium transition flex items-center gap-1.5"
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </button>

            <button
              onClick={() => handlePublishNow(selectedCampaign.id)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary/90 to-amber-500 hover:from-primary hover:to-amber-400 text-black font-semibold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              Publish Now
            </button>

            {selectedCampaign.status !== "Rejected" && (
              <button
                onClick={() => setRejectModalOpen(true)}
                className="px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (8 cols): Media Review & Content Review */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. MEDIA REVIEW SECTION */}
            <div className="luxury-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                    Media Review & Assets
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {selectedCampaign.images.length} Images · {selectedCampaign.videos.length} Videos
                </span>
              </div>

              {/* Videos Sub-section */}
              {selectedCampaign.videos.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5" />
                    Video Content Preview
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCampaign.videos.map(vid => (
                      <div key={vid.id} className="relative rounded-xl border border-border bg-black/40 overflow-hidden group">
                        <div className="relative aspect-[9/16] bg-black/60 flex items-center justify-center">
                          {vid.posterUrl && !isPlayingVideo[vid.id] && (
                            <img
                              src={vid.posterUrl}
                              alt={vid.title}
                              className="absolute inset-0 w-full h-full object-cover opacity-80"
                            />
                          )}
                          <video
                            controls={isPlayingVideo[vid.id]}
                            poster={vid.posterUrl}
                            src={vid.url}
                            className="w-full h-full object-cover"
                            onPlay={() => setIsPlayingVideo(p => ({ ...p, [vid.id]: true }))}
                            onPause={() => setIsPlayingVideo(p => ({ ...p, [vid.id]: false }))}
                          />
                          {!isPlayingVideo[vid.id] && (
                            <button
                              onClick={() => setIsPlayingVideo(p => ({ ...p, [vid.id]: true }))}
                              className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-primary/90 hover:bg-primary text-black flex items-center justify-center shadow-xl transition transform group-hover:scale-105"
                            >
                              <Play className="h-6 w-6 fill-black ml-0.5" />
                            </button>
                          )}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-amber-300 border border-amber-500/30">
                            {vid.duration} · {vid.resolution}
                          </span>
                          {vid.approved && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500/90 text-black text-[10px] font-bold flex items-center gap-1">
                              <Check className="h-3 w-3 stroke-[3]" /> Approved
                            </span>
                          )}
                        </div>

                        <div className="p-3 bg-secondary/30 border-t border-border flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">{vid.title}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleVideoApproval(vid.id)}
                              className={cn(
                                "px-2.5 py-1 rounded text-[11px] font-medium transition border",
                                vid.approved
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                              )}
                            >
                              {vid.approved ? "Approved" : "Approve Video"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images Sub-section */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Image Gallery Grid
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedCampaign.images.map(img => (
                    <div key={img.id} className="group relative rounded-lg border border-border bg-black/40 overflow-hidden">
                      <div className="relative aspect-square overflow-hidden bg-black/50">
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            onClick={() => setFullscreenImage(img.url)}
                            className="p-2 rounded-full bg-black/80 hover:bg-primary text-foreground hover:text-black transition"
                            title="Full screen preview"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteImage(img.id)}
                            className="p-2 rounded-full bg-black/80 hover:bg-destructive text-foreground hover:text-white transition"
                            title="Delete image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {img.approved && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-bold">
                            APPROVED
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-secondary/20 flex items-center justify-between gap-1 border-t border-border">
                        <span className="text-[11px] text-muted-foreground truncate">{img.title}</span>
                        <button
                          onClick={() => toggleImageApproval(img.id)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold border transition shrink-0",
                            img.approved
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-secondary text-muted-foreground hover:text-foreground border-border"
                          )}
                        >
                          {img.approved ? "Approved" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. CONTENT REVIEW SECTION */}
            <div className="luxury-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                    Content & Copy Review
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mr-1">AI Actions:</span>
                  <button
                    onClick={() => handleAiRefine("improve")}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px] font-medium transition"
                  >
                    ✨ Improve
                  </button>
                  <button
                    onClick={() => handleAiRefine("rewrite")}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground text-[11px] font-medium transition"
                  >
                    Rewrite
                  </button>
                  <button
                    onClick={() => handleAiRefine("luxury")}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium transition"
                  >
                    👑 Luxury Tone
                  </button>
                  <button
                    onClick={() => handleAiRefine("viral")}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded bg-chart-5/10 hover:bg-chart-5/20 border border-chart-5/30 text-chart-5 text-[11px] font-medium transition"
                  >
                    🔥 Viral Tone
                  </button>
                  <button
                    onClick={() => handleAiRefine("shorten")}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground text-[11px] font-medium transition"
                  >
                    Shorten
                  </button>
                  <button
                    onClick={() => handleAiRefine("expand")}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground text-[11px] font-medium transition"
                  >
                    Expand
                  </button>
                </div>
              </div>

              {/* Hook Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center justify-between">
                  <span>Today's Hook</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Attention Trigger</span>
                </label>
                <textarea
                  rows={2}
                  value={selectedCampaign.content.hook}
                  onChange={e => handleContentChange("hook", e.target.value)}
                  className="w-full rounded-lg bg-background border border-border p-3 text-sm text-foreground focus:outline-none focus:border-primary transition font-serif"
                />
              </div>

              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center justify-between">
                  <span>Main Caption</span>
                  <span className="text-[10px] text-muted-foreground font-mono">TikTok Post Body</span>
                </label>
                <textarea
                  rows={4}
                  value={selectedCampaign.content.caption}
                  onChange={e => handleContentChange("caption", e.target.value)}
                  className="w-full rounded-lg bg-background border border-border p-3 text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* CTA & Music */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Call To Action (CTA)
                  </label>
                  <input
                    type="text"
                    value={selectedCampaign.content.cta}
                    onChange={e => handleContentChange("cta", e.target.value)}
                    className="w-full rounded-lg bg-background border border-border p-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                    <Music className="h-3 w-3" /> Music Recommendation
                  </label>
                  <input
                    type="text"
                    value={selectedCampaign.content.musicRecommendation}
                    onChange={e => handleContentChange("musicRecommendation", e.target.value)}
                    className="w-full rounded-lg bg-background border border-border p-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition font-mono"
                  />
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Hashtags
                </label>
                <input
                  type="text"
                  value={selectedCampaign.content.hashtags.join(" ")}
                  onChange={e => handleContentChange("hashtags", e.target.value)}
                  className="w-full rounded-lg bg-background border border-border p-2.5 text-xs text-primary font-mono focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Thumbnail Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Thumbnail Visual Description
                </label>
                <input
                  type="text"
                  value={selectedCampaign.content.thumbnailDescription}
                  onChange={e => handleContentChange("thumbnailDescription", e.target.value)}
                  className="w-full rounded-lg bg-background border border-border p-2.5 text-xs text-muted-foreground focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

          </div>

          {/* Right Column (4 cols): AI Quality Check & Meta Details */}
          <div className="lg:col-span-4 space-y-6">

            {/* AI QUALITY CHECK RADAR */}
            <div className="luxury-card p-6 space-y-5 border-primary/30">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                    AI Quality Check
                  </h2>
                </div>
                <span className="text-lg font-serif font-bold luxury-gradient-text">
                  {selectedCampaign.qualityCheck.overallScore}/100
                </span>
              </div>

              <div className="space-y-3.5">
                {/* Hook Score */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Hook Score</span>
                    <span className="font-mono text-primary font-semibold">{selectedCampaign.qualityCheck.hookScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${selectedCampaign.qualityCheck.hookScore}%` }} />
                  </div>
                </div>

                {/* Caption Score */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Caption Score</span>
                    <span className="font-mono text-amber-400 font-semibold">{selectedCampaign.qualityCheck.captionScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${selectedCampaign.qualityCheck.captionScore}%` }} />
                  </div>
                </div>

                {/* Brand Consistency */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Brand Consistency</span>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedCampaign.qualityCheck.brandConsistency}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${selectedCampaign.qualityCheck.brandConsistency}%` }} />
                  </div>
                </div>

                {/* Visual Quality */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Visual Quality</span>
                    <span className="font-mono text-chart-5 font-semibold">{selectedCampaign.qualityCheck.visualQuality}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-chart-5 rounded-full" style={{ width: `${selectedCampaign.qualityCheck.visualQuality}%` }} />
                  </div>
                </div>

                {/* AI Confidence */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">AI Confidence</span>
                    <span className="font-mono text-primary font-semibold">{selectedCampaign.qualityCheck.aiConfidence}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${selectedCampaign.qualityCheck.aiConfidence}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  ✨ The AI Quality Model verified tone alignment against quiet luxury guidelines, high-retention hook cadence, and zero-logo visual constraints.
                </p>
              </div>
            </div>

            {/* Campaign Metadata */}
            <div className="luxury-card p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Campaign Info
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Created At</span>
                  <span className="font-mono text-foreground">{formatDate(selectedCampaign.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Target Account</span>
                  <span className="font-semibold text-primary">{selectedCampaign.targetAccount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Niche</span>
                  <span className="text-foreground">{selectedCampaign.niche}</span>
                </div>
                {selectedCampaign.scheduledDate && (
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Scheduled Date</span>
                    <span className="font-mono text-amber-300">{formatDate(selectedCampaign.scheduledDate)}</span>
                  </div>
                )}
                {selectedCampaign.publishedDate && (
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Published Date</span>
                    <span className="font-mono text-emerald-400">{formatDate(selectedCampaign.publishedDate)}</span>
                  </div>
                )}
                {selectedCampaign.rejectionReason && (
                  <div className="p-2.5 rounded bg-destructive/10 border border-destructive/30 text-destructive text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Rejection Note
                    </p>
                    <p className="text-[10px] text-destructive/80">{selectedCampaign.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Activity Timeline */}
            <div className="luxury-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                    Activity Timeline Log
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {selectedCampaign.timeline?.length || 0} events
                </span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {(!selectedCampaign.timeline || selectedCampaign.timeline.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-2">No activity events logged yet.</p>
                ) : (
                  selectedCampaign.timeline.map(event => (
                    <div key={event.id} className="relative pl-4 border-l border-primary/30 space-y-0.5 text-xs">
                      <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{event.title}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/70">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{event.description}</p>
                      {event.user && (
                        <span className="inline-block text-[9px] font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                          {event.user}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Modals ── */}
        {/* Schedule Modal */}
        {scheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="luxury-card w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Schedule Campaign
                </h3>
                <button onClick={() => setScheduleModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border p-3 text-sm font-mono text-primary focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  AI Recommended Peak Window: <span className="text-amber-300 font-mono">Tomorrow @ 11:00 AM EST</span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-secondary/40 text-xs text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleConfirm}
                  className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-xs hover:bg-primary/90"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="luxury-card w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif font-bold text-destructive flex items-center gap-2">
                  <BadgeAlert className="h-4 w-4" />
                  Reject Campaign
                </h3>
                <button onClick={() => setRejectModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Needs higher contrast background lighting or less conversational hook..."
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border p-3 text-xs text-foreground focus:outline-none focus:border-destructive"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-secondary/40 text-xs text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 rounded-lg bg-destructive text-white font-semibold text-xs hover:bg-destructive/90"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Image Preview */}
        {fullscreenImage && (
          <div
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <img src={fullscreenImage} alt="Full preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" />
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER CAMPAIGN LIST VIEW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-12">

      {/* Hero Title & Stats Banner */}
      <div className="luxury-card p-6 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                TLIS v0.16 Core Pipeline
              </span>
              <div className="live-dot" />
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold luxury-gradient-text">
              Review Center
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              The creative approval room where every AI-generated campaign is reviewed, refined, and authorized before publishing.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setStatusFilter("Awaiting Review")}
              className={cn(
                "p-3 rounded-lg border text-left transition",
                statusFilter === "Awaiting Review"
                  ? "bg-amber-400/20 border-amber-400/50"
                  : "bg-secondary/30 border-border hover:border-amber-400/30"
              )}
            >
              <span className="text-[10px] uppercase text-amber-300 font-semibold block">Awaiting Review</span>
              <span className="text-lg font-serif font-bold text-foreground">{stats.awaitingReview}</span>
            </button>

            <button
              onClick={() => setStatusFilter("Approved")}
              className={cn(
                "p-3 rounded-lg border text-left transition",
                statusFilter === "Approved"
                  ? "bg-emerald-400/20 border-emerald-400/50"
                  : "bg-secondary/30 border-border hover:border-emerald-400/30"
              )}
            >
              <span className="text-[10px] uppercase text-emerald-300 font-semibold block">Approved Today</span>
              <span className="text-lg font-serif font-bold text-foreground">{stats.approvedToday}</span>
            </button>

            <button
              onClick={() => setStatusFilter("Scheduled")}
              className={cn(
                "p-3 rounded-lg border text-left transition",
                statusFilter === "Scheduled"
                  ? "bg-primary/20 border-primary/50"
                  : "bg-secondary/30 border-border hover:border-primary/30"
              )}
            >
              <span className="text-[10px] uppercase text-primary font-semibold block">Scheduled</span>
              <span className="text-lg font-serif font-bold text-foreground">{stats.scheduled}</span>
            </button>

            <button
              onClick={() => setStatusFilter("Published")}
              className={cn(
                "p-3 rounded-lg border text-left transition",
                statusFilter === "Published"
                  ? "bg-chart-5/20 border-chart-5/50"
                  : "bg-secondary/30 border-border hover:border-chart-5/30"
              )}
            >
              <span className="text-[10px] uppercase text-chart-5 font-semibold block">Published</span>
              <span className="text-lg font-serif font-bold text-foreground">{stats.published}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {["All", "Draft", "Researching", "Generating", "Awaiting Review", "Approved", "Scheduled", "Publishing", "Published", "Analytics Complete", "Archived", "Rejected"].map(tab => {
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border",
                  isActive
                    ? "bg-primary text-black border-primary font-semibold shadow-md"
                    : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns or accounts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-background border border-border pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="luxury-card p-12 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <h3 className="text-sm font-semibold text-muted-foreground">No Campaigns Found</h3>
          <p className="text-xs text-muted-foreground/70 max-w-sm mx-auto">
            No campaigns match your selected filter <span className="text-primary font-semibold">"{statusFilter}"</span>.
          </p>
          <button
            onClick={() => { setStatusFilter("All"); setSearchQuery(""); }}
            className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs text-primary font-medium transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map(campaign => {
            const statusCfg = STATUS_COLORS[campaign.status];
            const coverImage = campaign.images[0]?.url || campaign.videos[0]?.posterUrl;

            return (
              <div
                key={campaign.id}
                className="luxury-card p-5 flex flex-col justify-between space-y-4 hover:border-primary/50 transition duration-300 group"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border", statusCfg.color, statusCfg.bg, statusCfg.border)}>
                      {campaign.status}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatDate(campaign.createdAt)}
                    </span>
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex gap-3 items-start">
                    {coverImage && (
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-black border border-border shrink-0">
                        <img src={coverImage} alt={campaign.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-serif font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-[11px] text-primary font-medium mt-0.5">
                        {campaign.targetAccount}
                      </p>
                    </div>
                  </div>

                  {/* Hook Teaser */}
                  <div className="p-2.5 rounded bg-secondary/30 border border-border/60 text-xs text-muted-foreground line-clamp-2 italic font-serif">
                    "{campaign.content.hook}"
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>Score: <strong className="text-foreground">{campaign.qualityCheck.overallScore}/100</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Film className="h-3 w-3 text-amber-400" />
                      <span>Assets: <strong className="text-foreground">{campaign.images.length + campaign.videos.length} items</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className="flex-1 px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Review Campaign
                  </button>

                  {campaign.status === "Awaiting Review" && (
                    <button
                      onClick={() => handleApprove(campaign.id)}
                      className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition"
                      title="Quick Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
