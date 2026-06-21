import { useState, useRef, useEffect, useCallback } from "react";
import { useSearch } from "wouter";
import {
  Sparkles, Copy, RefreshCw, Zap, Film, Lightbulb, MessageSquare,
  ChevronDown, AlertCircle, CalendarDays, Check, Database, Wifi, ExternalLink,
} from "lucide-react";
import { trackGeneration } from "@/lib/usage";
import { loadCalendar, saveToCalendar, type CalendarPlatform, type PostType } from "@/lib/calendar";
import { insertGenerationToCloud, upsertVaultEntryToCloud } from "@/lib/supabase";
import { loadVault, saveVault, addVaultEntry, createVaultEntry, type ContentType, type VaultPlatform } from "@/lib/vault";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const niches   = ["Quiet Luxury Lifestyle","Dark Feminine Aesthetic","Old Money Fashion","Silent Wealth Signals","Minimalist Wealth Flex","Luxury Morning Routine","Cinematic Travel","Understated Opulence"];
const styles   = ["Cinematic & Slow","Fast-Cut Energy","POV Narrative","Day-in-the-Life","Transformation Reveal","Talking Head","B-Roll Montage","Luxury Unboxing"];
const tones    = ["Aspirational","Mysterious","Authoritative","Intimate","Provocative","Educational","Stoic","Empowering"];
const platforms = ["TikTok","Instagram Reels","YouTube Shorts","Pinterest Idea Pins"];
const audiences = ["Luxury Aspirants 18–24","Affluent Millennials 25–34","High-Net-Worth 35–45","Fashion-Forward Women","Old Money Enthusiasts","Minimalist Lifestyle Seekers"];

type Tab = "hooks" | "captions" | "prompts" | "ideas";

const tabConfig: { id: Tab; label: string; icon: typeof Zap; desc: string }[] = [
  { id: "hooks",    label: "Viral Hooks",       icon: Zap,           desc: "Opening lines engineered for maximum 3-second retention" },
  { id: "captions", label: "Captions",          icon: MessageSquare, desc: "Platform-optimised captions that amplify reach" },
  { id: "prompts",  label: "Cinematic Prompts", icon: Film,          desc: "Director-level visual directions for your shoot" },
  { id: "ideas",    label: "Viral Ideas",       icon: Lightbulb,     desc: "Content concepts with proven viral architecture" },
];

const loadingPhrases: Record<Tab, string[]> = {
  hooks:    ["Scanning viral patterns…","Calibrating retention triggers…","Writing your opening line…"],
  captions: ["Analysing platform signals…","Crafting caption copy…","Optimising hashtag reach…"],
  prompts:  ["Composing shot directions…","Setting scene and light…","Finalising cinematic brief…"],
  ideas:    ["Mining trend data…","Architecting concept framework…","Packaging your content idea…"],
};

const TAB_TO_CONTENT_TYPE: Record<Tab, ContentType> = {
  hooks: "hook", captions: "caption", prompts: "script", ideas: "idea",
};
const TAB_TO_POST_TYPE: Record<Tab, PostType> = {
  hooks: "hook", captions: "caption", prompts: "prompt", ideas: "idea",
};
const PLATFORM_TO_VAULT: Record<string, VaultPlatform> = {
  "TikTok": "TikTok", "Instagram Reels": "Instagram",
  "YouTube Shorts": "YouTube", "Pinterest Idea Pins": "Pinterest",
};
const PLATFORM_TO_CAL: Record<string, CalendarPlatform> = {
  "TikTok": "TikTok", "Instagram Reels": "Instagram Reels",
  "YouTube Shorts": "YouTube Shorts", "Pinterest Idea Pins": "Pinterest",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface StreamOutput {
  text: string;
  streaming: boolean; // true while still receiving chunks
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

/** Skeleton card shown while a slot is being streamed */
function SkeletonCard({ index, streamingText }: { index: number; streamingText?: string }) {
  return (
    <div className="luxury-card p-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">
          Output {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Gemini 2.0 Flash
        </span>
      </div>

      {streamingText ? (
        <p className="text-sm text-foreground leading-relaxed">
          {streamingText}
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className="h-3.5 bg-muted/30 rounded-full animate-pulse w-full" />
          <div className="h-3.5 bg-muted/30 rounded-full animate-pulse w-5/6" />
          <div className="h-3.5 bg-muted/20 rounded-full animate-pulse w-4/6" />
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-muted/20 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-muted/20 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-muted/20 rounded-lg animate-pulse" />
          <div className="h-7 w-16 bg-muted/20 rounded-lg animate-pulse" />
          <div className="h-7 w-16 bg-muted/20 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Completed output card */
function OutputCard({
  text, index, activeTab, form, onVault, onCalendar, onCopy,
  savedToVault, savedToCalendar, copied,
}: {
  text: string; index: number; activeTab: Tab;
  form: { niche: string; style: string; tone: string; platform: string; audience: string };
  onVault: () => void; onCalendar: () => void; onCopy: () => void;
  savedToVault: boolean; savedToCalendar: boolean; copied: boolean;
}) {
  return (
    <div
      className="luxury-card p-5 group animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">
          Output {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-mono">
          Gemini 2.0 Flash
        </span>
      </div>

      <p className="text-sm text-foreground leading-relaxed">{text}</p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 bg-muted/30 border border-muted/50 rounded-full text-muted-foreground">{form.tone}</span>
          <span className="text-xs px-2 py-0.5 bg-muted/30 border border-muted/50 rounded-full text-muted-foreground">{form.platform}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Vault */}
          <button
            onClick={onVault}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all duration-200",
              savedToVault
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-muted/20 hover:bg-primary/10 border-border hover:border-primary/30 text-muted-foreground hover:text-primary"
            )}
          >
            {savedToVault ? <Check className="h-3 w-3" /> : <Database className="h-3 w-3" />}
            {savedToVault ? "Vaulted!" : "Vault"}
          </button>
          {/* Calendar */}
          <button
            onClick={onCalendar}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all duration-200",
              savedToCalendar
                ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                : "bg-muted/20 hover:bg-primary/10 border-border hover:border-primary/30 text-muted-foreground hover:text-primary"
            )}
          >
            {savedToCalendar ? <Check className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
            {savedToCalendar ? "Saved!" : "Calendar"}
          </button>
          {/* Copy */}
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary transition-all duration-200"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main generator ─────────────────────────────────────────────────────────

export default function Generator() {
  const [form, setForm] = useState({
    niche:    niches[0],
    style:    styles[0],
    tone:     tones[0],
    platform: platforms[0],
    audience: audiences[0],
  });

  const search = useSearch();

  const [activeTab, setActiveTab]         = useState<Tab>("hooks");
  const [streamOutputs, setStreamOutputs] = useState<StreamOutput[]>([]);
  const [finalOutputs, setFinalOutputs]   = useState<string[]>([]);
  const [loading, setLoading]             = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const [errorCode, setErrorCode]         = useState<string | null>(null);
  const [retryCount, setRetryCount]       = useState(0);
  const [retrying, setRetrying]           = useState(false);
  const [generated, setGenerated]         = useState(false);
  const [copied, setCopied]               = useState<number | null>(null);
  const [savedToVault, setSavedToVault]   = useState<Record<number, boolean>>({});
  const [savedToCalendar, setSavedToCalendar] = useState<Record<number, boolean>>({});

  // Track auto-vault state per index (auto-saved on completion)
  const autoVaulted = useRef<Set<number>>(new Set());
  const abortRef    = useRef<AbortController | null>(null);
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read URL params on first mount to pre-configure the brief
  useEffect(() => {
    if (!search) return;
    const params = new URLSearchParams(search);
    const tab = params.get("tab") as Tab | null;
    const niche = params.get("niche");
    if (tab && (["hooks","captions","prompts","ideas"] as Tab[]).includes(tab)) {
      setActiveTab(tab);
    }
    if (niche && niches.includes(niche)) {
      setForm(f => ({ ...f, niche }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    if (phraseTimer.current) clearInterval(phraseTimer.current);
  }, []);

  // ── Auto-save a completed output to vault ──────────────────────────────
  const autoSaveToVault = useCallback((index: number, text: string, tab: Tab, currentForm: typeof form) => {
    if (autoVaulted.current.has(index)) return;
    autoVaulted.current.add(index);

    const entry = createVaultEntry({
      content: text,
      type: TAB_TO_CONTENT_TYPE[tab],
      platform: PLATFORM_TO_VAULT[currentForm.platform] ?? "TikTok",
      niche: currentForm.niche,
      tone: currentForm.tone,
      source: "generator",
      model: "gemini-2.0-flash",
      prompt: `Type: ${tab} | Niche: ${currentForm.niche} | Style: ${currentForm.style} | Tone: ${currentForm.tone} | Platform: ${currentForm.platform} | Audience: ${currentForm.audience}`,
    });
    const current = loadVault();
    saveVault(addVaultEntry(current, entry));
    upsertVaultEntryToCloud(entry).catch(() => null);
  }, []);

  // ── Streaming generate ─────────────────────────────────────────────────
  const handleGenerate = useCallback(async (tab: Tab, isRetry = false) => {
    // Abort previous request if any
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    autoVaulted.current.clear();

    setActiveTab(tab);
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setGenerated(false);
    setStreamOutputs([]);
    setFinalOutputs([]);
    setSavedToVault({});
    setSavedToCalendar({});
    setRetrying(false);
    if (!isRetry) setRetryCount(0);

    // Cycling loading phrase
    const phrases = loadingPhrases[tab];
    let phraseIdx = 0;
    setLoadingPhrase(phrases[0]);
    phraseTimer.current = setInterval(() => {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      setLoadingPhrase(phrases[phraseIdx]);
    }, 1400);

    const stopPhrase = () => {
      if (phraseTimer.current) { clearInterval(phraseTimer.current); phraseTimer.current = null; }
    };

    try {
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, ...form }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `Server error ${res.status}`);
      }

      stopPhrase();

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // State for building outputs from stream events
      const completedOutputs: string[] = [];
      // We track chunks per index for the streaming preview
      const chunkBuffers: Record<number, string> = {};

      // Show 3 skeleton cards immediately
      setStreamOutputs([
        { text: "", streaming: true },
        { text: "", streaming: true },
        { text: "", streaming: true },
      ]);

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: any;
          try { event = JSON.parse(raw); } catch { continue; }

          // Retry signal from server
          if (event.retrying) {
            setRetrying(true);
            setStreamOutputs([
              { text: "", streaming: true },
              { text: "", streaming: true },
              { text: "", streaming: true },
            ]);
            Object.keys(chunkBuffers).forEach(k => { chunkBuffers[Number(k)] = ""; });
            completedOutputs.length = 0;
            continue;
          }

          // Streaming chunk for current in-progress item
          if (typeof event.chunk === "string" && typeof event.index === "number") {
            setRetrying(false);
            chunkBuffers[event.index] = (chunkBuffers[event.index] ?? "") + event.chunk;
            // Only update the currently streaming card (the first incomplete one)
            const currentIdx = completedOutputs.length;
            if (event.index === currentIdx) {
              setStreamOutputs(prev => {
                const next = [...prev];
                if (next[currentIdx]) next[currentIdx] = { text: chunkBuffers[currentIdx] ?? "", streaming: true };
                return next;
              });
            }
          }

          // Output complete
          if (event.done && typeof event.output === "string") {
            const idx: number = event.index ?? completedOutputs.length;
            completedOutputs[idx] = event.output;
            // Mark this card done, unlock next skeleton
            setStreamOutputs(prev => {
              const next = [...prev];
              if (next[idx]) next[idx] = { text: event.output, streaming: false };
              return next;
            });
            // Auto-save to vault
            autoSaveToVault(idx, event.output, tab, form);
          }

          // Error
          if (event.error) {
            const err = new Error(event.error as string);
            (err as any).code = event.code;
            throw err;
          }

          // All done
          if (event.complete) {
            setFinalOutputs(completedOutputs.slice(0, event.count));
            setGenerated(true);
            setLoading(false);
            setStreamOutputs([]);

            // Track usage
            const usageData = trackGeneration(tab, form.niche, form.tone);
            if (usageData.history.length > 0) {
              insertGenerationToCloud(usageData.history[0]).catch(() => null);
            }
            break outer;
          }
        }
      }
    } catch (err: any) {
      stopPhrase();
      if (err?.name === "AbortError") return; // user navigated away
      const msg = err?.message ?? "Generation failed. Please try again.";
      setError(msg);
      setErrorCode((err as any)?.code ?? null);
      setGenerated(false);
      setStreamOutputs([]);
    } finally {
      stopPhrase();
      setLoading(false);
      setRetrying(false);
    }
  }, [form, autoSaveToVault]);

  const handleRetry = () => { setRetryCount(c => c + 1); handleGenerate(activeTab, true); };
  const handleRefresh = () => handleGenerate(activeTab);

  const handleCopy = (i: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  // Manual vault save (user clicks Vault on a completed card)
  const handleManualVault = (i: number, text: string) => {
    const entry = createVaultEntry({
      content: text,
      type: TAB_TO_CONTENT_TYPE[activeTab],
      platform: PLATFORM_TO_VAULT[form.platform] ?? "TikTok",
      niche: form.niche, tone: form.tone,
      source: "generator", model: "gemini-2.0-flash",
      prompt: `Type: ${activeTab} | Niche: ${form.niche} | Style: ${form.style} | Tone: ${form.tone} | Platform: ${form.platform} | Audience: ${form.audience}`,
    });
    const current = loadVault();
    saveVault(addVaultEntry(current, entry));
    upsertVaultEntryToCloud(entry).catch(() => null);
    setSavedToVault(prev => ({ ...prev, [i]: true }));
    setTimeout(() => setSavedToVault(prev => ({ ...prev, [i]: false })), 3000);
  };

  const handleSaveToCalendar = (i: number, text: string) => {
    const calPlatform: CalendarPlatform = PLATFORM_TO_CAL[form.platform] ?? "TikTok";
    const today = new Date().toISOString().slice(0, 10);
    const current = loadCalendar();
    saveToCalendar(current, text, TAB_TO_POST_TYPE[activeTab], calPlatform, form.niche, today);
    setSavedToCalendar(prev => ({ ...prev, [i]: true }));
    setTimeout(() => setSavedToCalendar(prev => ({ ...prev, [i]: false })), 3000);
  };

  const currentTab = tabConfig.find(t => t.id === activeTab)!;

  // Determine what to render in the output panel
  const isStreaming = loading && streamOutputs.length > 0;
  const showSkeleton3 = loading && streamOutputs.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 06</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">AI Content Generator</h1>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-sm">Configure your creative brief. Let the intelligence engine do the rest.</p>
          <span className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 font-mono flex-shrink-0">
            <Wifi className="h-2.5 w-2.5" />
            Gemini 2.0 Flash
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Config Panel ── */}
        <div className="lg:col-span-2 space-y-5">
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

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Brief Summary</p>
              <div className="bg-muted/20 rounded-lg p-3 space-y-1">
                {[["Niche", form.niche],["Style", form.style],["Tone", form.tone],["Platform", form.platform],["Audience", form.audience]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <span className="text-xs text-primary font-mono truncate max-w-[60%] text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generation type buttons */}
          <div className="grid grid-cols-2 gap-3">
            {tabConfig.map(tab => (
              <button
                key={tab.id}
                onClick={() => !loading && handleGenerate(tab.id)}
                disabled={loading}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed",
                  activeTab === tab.id && (generated || isStreaming || error)
                    ? "bg-primary/10 border-primary/40"
                    : "bg-card border-card-border hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                <tab.icon className={cn("h-4 w-4", activeTab === tab.id && (generated || isStreaming || error) ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                <span className={cn("text-xs font-semibold uppercase tracking-wide leading-tight", activeTab === tab.id && (generated || isStreaming || error) ? "text-primary" : "text-foreground")}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Output Panel ── */}
        <div className="lg:col-span-3">
          <div className="luxury-card min-h-[480px] flex flex-col">
            {/* Panel header */}
            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground flex items-center gap-2">
                  <currentTab.icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{currentTab.label}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{currentTab.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {retrying && (
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 font-mono animate-pulse">
                    Retrying…
                  </span>
                )}
                {generated && !loading && !error && (
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all duration-200"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-5">

              {/* ── Initial full-panel loading (before stream starts) ── */}
              {showSkeleton3 && (
                <div className="h-full min-h-64 flex flex-col items-center justify-center gap-5">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground font-medium tabular-nums min-w-[220px]">{loadingPhrase}</p>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Gemini 2.0 Flash · {form.niche}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="h-1.5 w-10 bg-primary/15 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-pulse" style={{ animationDelay: `${i * 250}ms` }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Streaming skeleton cards ── */}
              {isStreaming && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="live-dot" />
                    <p className="text-xs text-primary uppercase tracking-widest">
                      Streaming · Gemini 2.0 Flash · {form.niche}
                    </p>
                  </div>
                  {streamOutputs.map((out, i) => (
                    out.streaming ? (
                      <SkeletonCard key={i} index={i} streamingText={out.text || undefined} />
                    ) : (
                      <OutputCard
                        key={i} index={i} text={out.text} activeTab={activeTab} form={form}
                        onVault={() => handleManualVault(i, out.text)}
                        onCalendar={() => handleSaveToCalendar(i, out.text)}
                        onCopy={() => handleCopy(i, out.text)}
                        savedToVault={!!savedToVault[i]}
                        savedToCalendar={!!savedToCalendar[i]}
                        copied={copied === i}
                      />
                    )
                  ))}
                </div>
              )}

              {/* ── Error state ── */}
              {!loading && error && (
                <div className="h-full min-h-64 flex flex-col items-center justify-center gap-4 text-center px-6">
                  {errorCode === "QUOTA_EXHAUSTED" ? (
                    <>
                      <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Wifi className="h-6 w-6 text-primary" />
                      </div>
                      <div className="max-w-sm">
                        <p className="text-foreground font-serif font-semibold text-lg">Daily quota reached</p>
                        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                          The free Gemini API tier has been exhausted for today. Quota resets automatically at midnight Pacific time.
                        </p>
                        <div className="mt-4 space-y-2 text-left bg-muted/20 rounded-lg p-4 border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Unblock now</p>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-primary font-mono mt-0.5">01</span>
                            <p className="text-xs text-foreground">Enable billing on your Google Cloud project to lift the limit instantly</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-primary font-mono mt-0.5">02</span>
                            <p className="text-xs text-foreground">Get a fresh key from a new Google account at aistudio.google.com/apikey and update GEMINI_API_KEY in Secrets</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-primary font-mono mt-0.5">03</span>
                            <p className="text-xs text-foreground">Wait for midnight Pacific — quota resets automatically</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Get new API key
                        </a>
                        <button
                          onClick={() => { setError(null); setErrorCode(null); }}
                          className="px-4 py-2 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-14 w-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <p className="text-foreground font-serif font-semibold">Generation failed</p>
                        <p className="text-muted-foreground text-sm mt-1 max-w-xs">{error}</p>
                        {retryCount < 3 && (
                          <p className="text-xs text-muted-foreground/60 mt-1">Attempt {retryCount + 1} of 3</p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        {retryCount < 3 && (
                          <button
                            onClick={handleRetry}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => { setError(null); setErrorCode(null); }}
                          className="px-4 py-2 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Empty / ready state ── */}
              {!loading && !error && !generated && (
                <div className="h-full min-h-64 flex flex-col items-center justify-center gap-4 text-center px-8">
                  <div className="h-16 w-16 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-foreground font-serif font-semibold text-lg">Ready to generate</p>
                    <p className="text-muted-foreground text-sm mt-1">Configure your brief and select a generation type to begin.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
                    {tabConfig.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleGenerate(tab.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all duration-200"
                      >
                        <tab.icon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Final completed outputs ── */}
              {!loading && !error && generated && finalOutputs.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="live-dot" />
                    <p className="text-xs text-primary uppercase tracking-widest">
                      {finalOutputs.length} outputs · {form.niche} · {form.tone}
                    </p>
                    <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5 font-mono flex items-center gap-1">
                      <Database className="h-2.5 w-2.5" />
                      Auto-vaulted
                    </span>
                  </div>
                  {finalOutputs.map((text, i) => (
                    <OutputCard
                      key={`${activeTab}-${i}`} index={i} text={text} activeTab={activeTab} form={form}
                      onVault={() => handleManualVault(i, text)}
                      onCalendar={() => handleSaveToCalendar(i, text)}
                      onCopy={() => handleCopy(i, text)}
                      savedToVault={!!savedToVault[i]}
                      savedToCalendar={!!savedToCalendar[i]}
                      copied={copied === i}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
