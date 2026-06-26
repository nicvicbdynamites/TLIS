import { useState, useRef, useEffect, useCallback } from "react";
import {
  Package, Sparkles, Copy, Check, Database, CalendarDays,
  Clock, Film, Hash, Zap, MessageSquare, RefreshCw, Wifi,
  ChevronDown, AlertCircle, Star, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackGeneration } from "@/lib/usage";
import { loadCalendar, saveToCalendar } from "@/lib/calendar";
import {
  loadVault, saveVault, addVaultEntry, createVaultEntry,
} from "@/lib/vault";
import {
  insertGenerationToCloud, upsertVaultEntryToCloud, upsertPostToCloud,
  saveContentPackToCloud, fetchContentPacksFromCloud,
  deleteContentPackFromCloud, toggleContentPackFavourite,
  type ContentPackRecord,
} from "@/lib/supabase";

// ── Constants ──────────────────────────────────────────────────────────────

const niches   = ["Quiet Luxury Lifestyle","Dark Feminine Aesthetic","Old Money Fashion","Silent Wealth Signals","Minimalist Wealth Flex","Luxury Morning Routine","Cinematic Travel","Understated Opulence"];
const styles   = ["Cinematic & Slow","Fast-Cut Energy","POV Narrative","Day-in-the-Life","Transformation Reveal","Talking Head","B-Roll Montage","Luxury Unboxing"];
const tones    = ["Aspirational","Mysterious","Authoritative","Intimate","Provocative","Educational","Stoic","Empowering"];
const platforms = ["TikTok","Instagram Reels","YouTube Shorts","Pinterest Idea Pins"];
const audiences = ["Luxury Aspirants 18–24","Affluent Millennials 25–34","High-Net-Worth 35–45","Fashion-Forward Women","Old Money Enthusiasts","Minimalist Lifestyle Seekers"];

const LOADING_PHASES = [
  "Crafting viral hook...",
  "Writing luxury caption...",
  "Directing cinematic prompt...",
  "Selecting power hashtags...",
  "Composing call to action...",
  "Calculating optimal timing...",
];

// ── Types ──────────────────────────────────────────────────────────────────

interface GeneratedPack {
  hook: string;
  caption: string;
  video_prompt: string;
  hashtags: string[];
  cta: string;
  best_posting_time: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SelectField({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-card border border-card-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer pr-9"
        >
          {options.map(o => <option key={o} value={o} className="bg-card">{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary transition-all duration-200"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function FieldCard({
  icon: Icon, label, children, copyText, className = "",
}: {
  icon: typeof Zap; label: string; children: React.ReactNode; copyText?: string; className?: string;
}) {
  return (
    <div className={cn("luxury-card p-5 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function LoadingState({ phase }: { phase: string }) {
  return (
    <div className="luxury-card p-10 flex flex-col items-center justify-center gap-6 min-h-[420px]">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
          <Package className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground animate-pulse">{phase}</p>
        <p className="text-xs text-muted-foreground">Gemini 2.5 Flash is building your content pack</p>
      </div>
      <div className="flex gap-1.5">
        {LOADING_PHASES.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full bg-primary/30 animate-pulse"
            style={{ width: "28px", animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="luxury-card p-10 flex flex-col items-center justify-center gap-4 min-h-[420px] border-dashed">
      <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Package className="h-6 w-6 text-primary/60" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-foreground">No pack generated yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">Configure your creative brief and generate a complete content pack — hook, caption, prompt, hashtags, CTA, and optimal posting time.</p>
      </div>
    </div>
  );
}

// ── History Item ───────────────────────────────────────────────────────────

function HistoryItem({
  pack, onDelete, onToggleFav,
}: {
  pack: ContentPackRecord;
  onDelete: (id: string) => void;
  onToggleFav: (id: string, fav: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="luxury-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-left w-full"
          >
            <p className="text-sm font-medium text-foreground line-clamp-1">{pack.hook}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground font-mono">{pack.niche}</span>
              <span className="text-[10px] text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{pack.platform}</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onToggleFav(pack.id, !pack.isFavourite)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              pack.isFavourite ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", pack.isFavourite && "fill-primary")} />
          </button>
          <button
            onClick={() => onDelete(pack.id)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown
            onClick={() => setExpanded(e => !e)}
            className={cn("h-3.5 w-3.5 text-muted-foreground cursor-pointer transition-transform", expanded && "rotate-180")}
          />
        </div>
      </div>
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border text-xs text-muted-foreground">
          <p><span className="text-primary/70 uppercase tracking-wider text-[10px]">Caption</span><br />{pack.caption}</p>
          <p><span className="text-primary/70 uppercase tracking-wider text-[10px]">CTA</span><br />{pack.cta}</p>
          <p><span className="text-primary/70 uppercase tracking-wider text-[10px]">Best Time</span><br />{pack.bestPostingTime}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {pack.hashtags.map(h => (
              <span key={h} className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-mono">{h}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ContentPackGenerator() {
  const [form, setForm] = useState({
    niche:    niches[0],
    style:    styles[0],
    tone:     tones[0],
    platform: platforms[0],
    audience: audiences[0],
  });

  const [loading, setLoading]             = useState(false);
  const [loadingPhase, setLoadingPhase]   = useState(LOADING_PHASES[0]);
  const [error, setError]                 = useState<string | null>(null);
  const [pack, setPack]                   = useState<GeneratedPack | null>(null);
  const [model, setModel]                 = useState("");
  const [savedToVault, setSavedToVault]   = useState(false);
  const [savedToCalendar, setSavedToCalendar] = useState(false);
  const [savedToPacks, setSavedToPacks]   = useState(false);
  const [isSavingPack, setIsSavingPack]   = useState(false);
  const [savePackError, setSavePackError] = useState(false);
  const [allCopied, setAllCopied]         = useState(false);
  const [history, setHistory]             = useState<ContentPackRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    fetchContentPacksFromCloud().then(packs => {
      setHistory(packs);
      setHistoryLoading(false);
    }).catch(() => setHistoryLoading(false));
  }, []);

  // Cleanup
  useEffect(() => () => {
    abortRef.current?.abort();
    if (phraseTimer.current) clearInterval(phraseTimer.current);
  }, []);

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setError(null);
    setPack(null);
    setSavedToVault(false);
    setSavedToCalendar(false);
    setSavedToPacks(false);

    // Cycle loading phases
    let phaseIdx = 0;
    setLoadingPhase(LOADING_PHASES[0]);
    phraseTimer.current = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % LOADING_PHASES.length;
      setLoadingPhase(LOADING_PHASES[phaseIdx]);
    }, 1200);

    const stopPhrase = () => {
      if (phraseTimer.current) { clearInterval(phraseTimer.current); phraseTimer.current = null; }
    };

    try {
      const res = await fetch("/api/generate/content-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: abort.signal,
      });

      stopPhrase();

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { pack: GeneratedPack; model: string };
      setPack(data.pack);
      setModel(data.model);

      // Track usage
      const usageData = trackGeneration("content-pack" as never, form.niche, form.tone);
      if (usageData.history.length > 0) {
        insertGenerationToCloud(usageData.history[0]).catch(() => null);
      }
    } catch (err: unknown) {
      stopPhrase();
      if ((err as { name?: string })?.name === "AbortError") return;
      setError((err as Error)?.message ?? "Generation failed. Please try again.");
    } finally {
      stopPhrase();
      setLoading(false);
    }
  }, [form]);

  // ── Save to Vault ─────────────────────────────────────────────────────────
  const handleSaveToVault = useCallback(() => {
    if (!pack) return;
    const current = loadVault();
    const entries = [
      { content: pack.hook, type: "hook" as const, label: "Hook" },
      { content: pack.caption, type: "caption" as const, label: "Caption" },
      { content: pack.video_prompt, type: "script" as const, label: "Video Prompt" },
      { content: pack.hashtags.join(" "), type: "hashtags" as const, label: "Hashtags" },
    ];
    let state = current;
    entries.forEach(({ content, type, label }) => {
      const entry = createVaultEntry({
        content,
        type,
        platform: (form.platform === "TikTok" ? "TikTok"
          : form.platform === "Instagram Reels" ? "Instagram"
          : form.platform === "YouTube Shorts" ? "YouTube" : "Pinterest") as never,
        niche: form.niche,
        tone: form.tone,
        source: "generator",
        model: model || "gemini-2.5-flash",
        prompt: `Content Pack ${label} | Niche: ${form.niche} | Style: ${form.style} | Tone: ${form.tone}`,
      });
      state = addVaultEntry(state, entry);
      upsertVaultEntryToCloud(entry).catch(() => null);
    });
    saveVault(state);
    setSavedToVault(true);
    setTimeout(() => setSavedToVault(false), 3000);
  }, [pack, form, model]);

  // ── Add to Calendar ───────────────────────────────────────────────────────
  const handleAddToCalendar = useCallback(() => {
    if (!pack) return;
    const calPlatform = (
      form.platform === "TikTok" ? "TikTok"
      : form.platform === "Instagram Reels" ? "Instagram Reels"
      : form.platform === "YouTube Shorts" ? "YouTube Shorts" : "Pinterest"
    ) as "TikTok" | "Instagram Reels" | "YouTube Shorts" | "Pinterest";

    const today = new Date().toISOString().slice(0, 10);
    const calState = loadCalendar();
    const updated = saveToCalendar(calState, pack.hook, "hook", calPlatform, form.niche, today);
    const newPost = updated[updated.length - 1];
    if (newPost) {
      upsertPostToCloud(newPost).catch(() => null);
    }
    setSavedToCalendar(true);
    setTimeout(() => setSavedToCalendar(false), 3000);
  }, [pack, form]);

  // ── Save Pack to Supabase ──────────────────────────────────────────────────
  const handleSavePack = useCallback(async () => {
    if (!pack || isSavingPack) return;
    setIsSavingPack(true);
    setSavePackError(false);
    const record: ContentPackRecord = {
      id:              crypto.randomUUID(),
      niche:           form.niche,
      style:           form.style,
      tone:            form.tone,
      platform:        form.platform,
      audience:        form.audience,
      hook:            pack.hook,
      caption:         pack.caption,
      videoPrompt:     pack.video_prompt,
      hashtags:        pack.hashtags,
      cta:             pack.cta,
      bestPostingTime: pack.best_posting_time,
      model:           model || "gemini-2.5-flash",
      isFavourite:     false,
      createdAt:       new Date().toISOString(),
    };
    const ok = await saveContentPackToCloud(record);
    setIsSavingPack(false);
    if (ok) {
      setHistory(prev => [record, ...prev]);
      setSavedToPacks(true);
      setTimeout(() => setSavedToPacks(false), 3000);
    } else {
      setSavePackError(true);
      setTimeout(() => setSavePackError(false), 3000);
    }
  }, [pack, form, model, isSavingPack]);

  // ── Copy All ──────────────────────────────────────────────────────────────
  const handleCopyAll = useCallback(() => {
    if (!pack) return;
    const text = [
      `HOOK:\n${pack.hook}`,
      `\nCAPTION:\n${pack.caption}`,
      `\nVIDEO PROMPT:\n${pack.video_prompt}`,
      `\nHASHTAGS:\n${pack.hashtags.join(" ")}`,
      `\nCTA:\n${pack.cta}`,
      `\nBEST POSTING TIME:\n${pack.best_posting_time}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  }, [pack]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    await deleteContentPackFromCloud(id);
    setHistory(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleToggleFav = useCallback(async (id: string, fav: boolean) => {
    await toggleContentPackFavourite(id, fav);
    setHistory(prev => prev.map(p => p.id === id ? { ...p, isFavourite: fav } : p));
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 11</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Content Pack Generator</h1>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-sm">Generate a complete content pack in one click — hook, caption, video direction, hashtags, CTA, and optimal posting time.</p>
          <span className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 font-mono flex-shrink-0">
            <Wifi className="h-2.5 w-2.5" />
            Gemini 2.5 Flash
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Brief Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="luxury-card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Creative Brief</h2>
            </div>

            <SelectField label="Niche"           options={niches}     value={form.niche}    onChange={v => setForm(f => ({ ...f, niche: v }))} />
            <SelectField label="Video Style"     options={styles}     value={form.style}    onChange={v => setForm(f => ({ ...f, style: v }))} />
            <SelectField label="Tone"            options={tones}      value={form.tone}     onChange={v => setForm(f => ({ ...f, tone: v }))} />
            <SelectField label="Platform"        options={platforms}  value={form.platform} onChange={v => setForm(f => ({ ...f, platform: v }))} />
            <SelectField label="Target Audience" options={audiences}  value={form.audience} onChange={v => setForm(f => ({ ...f, audience: v }))} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 py-4 rounded-xl border font-semibold text-sm tracking-widest uppercase transition-all duration-300",
              loading
                ? "bg-primary/5 border-primary/20 text-primary/40 cursor-not-allowed"
                : "bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/60 text-primary shadow-sm hover:shadow-primary/10"
            )}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Pack...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Generate Content Pack
              </>
            )}
          </button>

          {/* What's inside */}
          <div className="luxury-card p-4 space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Pack includes</p>
            {[
              { icon: Zap, label: "Viral Hook" },
              { icon: MessageSquare, label: "Luxury Caption" },
              { icon: Film, label: "Cinematic Prompt" },
              { icon: Hash, label: "Power Hashtags" },
              { icon: Sparkles, label: "Call to Action" },
              { icon: Clock, label: "Best Posting Time" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary/60" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Output Panel ── */}
        <div className="lg:col-span-3 space-y-4">
          {loading && <LoadingState phase={loadingPhase} />}

          {!loading && !pack && !error && <EmptyState />}

          {!loading && error && (
            <div className="luxury-card p-8 flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive mb-1">Generation failed</p>
                <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
              </div>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {!loading && pack && (
            <>
              {/* ── Model Badge + Actions ── */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 font-mono mr-auto">
                  <Wifi className="h-2.5 w-2.5" />
                  {model || "Gemini 2.5 Flash"}
                </span>
                <button
                  onClick={handleCopyAll}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-xs border transition-all duration-200",
                    allCopied
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/20 hover:bg-primary/10 border-border hover:border-primary/30 text-muted-foreground hover:text-primary"
                  )}
                >
                  {allCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {allCopied ? "Copied!" : "Copy All"}
                </button>
                <button
                  onClick={handleSaveToVault}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-xs border transition-all duration-200",
                    savedToVault
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/20 hover:bg-primary/10 border-border hover:border-primary/30 text-muted-foreground hover:text-primary"
                  )}
                >
                  {savedToVault ? <Check className="h-3 w-3" /> : <Database className="h-3 w-3" />}
                  {savedToVault ? "Vaulted!" : "Save to Vault"}
                </button>
                <button
                  onClick={handleAddToCalendar}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-xs border transition-all duration-200",
                    savedToCalendar
                      ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                      : "bg-muted/20 hover:bg-primary/10 border-border hover:border-primary/30 text-muted-foreground hover:text-primary"
                  )}
                >
                  {savedToCalendar ? <Check className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
                  {savedToCalendar ? "Added!" : "Calendar"}
                </button>
                <button
                  onClick={handleSavePack}
                  disabled={isSavingPack}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-xs border transition-all duration-200",
                    savedToPacks
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : savePackError
                        ? "bg-destructive/10 border-destructive/40 text-destructive"
                        : isSavingPack
                          ? "bg-primary/5 border-primary/20 text-primary/40 cursor-not-allowed"
                          : "bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/50 text-primary"
                  )}
                >
                  {savedToPacks ? (
                    <><Check className="h-3 w-3" />Saved!</>
                  ) : savePackError ? (
                    <><AlertCircle className="h-3 w-3" />Save Failed</>
                  ) : isSavingPack ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" />Saving...</>
                  ) : (
                    <><Package className="h-3 w-3" />Save Pack</>
                  )}
                </button>
              </div>

              {/* ── Hook ── */}
              <FieldCard icon={Zap} label="Viral Hook" copyText={pack.hook}>
                <p className="text-base font-medium text-foreground leading-relaxed">{pack.hook}</p>
              </FieldCard>

              {/* ── Caption + Video Prompt ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldCard icon={MessageSquare} label="Caption" copyText={pack.caption}>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{pack.caption}</p>
                </FieldCard>
                <FieldCard icon={Film} label="Cinematic Prompt" copyText={pack.video_prompt}>
                  <p className="text-sm text-foreground leading-relaxed">{pack.video_prompt}</p>
                </FieldCard>
              </div>

              {/* ── Hashtags ── */}
              <FieldCard icon={Hash} label="Hashtags" copyText={pack.hashtags.join(" ")}>
                <div className="flex flex-wrap gap-1.5">
                  {pack.hashtags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs font-mono bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-md"
                    >
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </FieldCard>

              {/* ── CTA + Best Posting Time ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldCard icon={Sparkles} label="Call to Action" copyText={pack.cta}>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{pack.cta}</p>
                </FieldCard>
                <FieldCard icon={Clock} label="Best Posting Time">
                  <p className="text-sm text-foreground leading-relaxed">{pack.best_posting_time}</p>
                </FieldCard>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Pack History ── */}
      {(history.length > 0 || historyLoading) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Saved Packs</h2>
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {history.length}
            </span>
          </div>
          {historyLoading ? (
            <div className="luxury-card p-6 animate-pulse">
              <div className="h-4 bg-muted/30 rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted/20 rounded w-1/2" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map(p => (
                <HistoryItem
                  key={p.id}
                  pack={p}
                  onDelete={handleDeleteHistory}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
