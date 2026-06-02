import { useState } from "react";
import { Sparkles, Copy, RefreshCw, Zap, Film, Lightbulb, MessageSquare, ChevronDown, AlertCircle } from "lucide-react";
import { trackGeneration } from "@/lib/usage";

const niches = ["Quiet Luxury Lifestyle", "Dark Feminine Aesthetic", "Old Money Fashion", "Silent Wealth Signals", "Minimalist Wealth Flex", "Luxury Morning Routine", "Cinematic Travel", "Understated Opulence"];
const styles = ["Cinematic & Slow", "Fast-Cut Energy", "POV Narrative", "Day-in-the-Life", "Transformation Reveal", "Talking Head", "B-Roll Montage", "Luxury Unboxing"];
const tones = ["Aspirational", "Mysterious", "Authoritative", "Intimate", "Provocative", "Educational", "Stoic", "Empowering"];
const platforms = ["TikTok", "Instagram Reels", "YouTube Shorts", "Pinterest Idea Pins"];
const audiences = ["Luxury Aspirants 18–24", "Affluent Millennials 25–34", "High-Net-Worth 35–45", "Fashion-Forward Women", "Old Money Enthusiasts", "Minimalist Lifestyle Seekers"];

type Tab = "hooks" | "captions" | "prompts" | "ideas";

const tabConfig: { id: Tab; label: string; icon: typeof Zap; desc: string }[] = [
  { id: "hooks", label: "Generate Hooks", icon: Zap, desc: "Opening lines engineered for maximum 3-second retention" },
  { id: "captions", label: "Generate Captions", icon: MessageSquare, desc: "Platform-optimised captions that amplify reach" },
  { id: "prompts", label: "Cinematic Prompts", icon: Film, desc: "Director-level visual directions for your shoot" },
  { id: "ideas", label: "Viral Ideas", icon: Lightbulb, desc: "Content concepts with proven viral architecture" },
];

const loadingPhrases: Record<Tab, string[]> = {
  hooks: ["Scanning viral patterns…", "Calibrating retention triggers…", "Writing your opening line…"],
  captions: ["Analysing platform signals…", "Crafting caption copy…", "Optimising hashtag reach…"],
  prompts: ["Composing shot directions…", "Setting scene and light…", "Finalising cinematic brief…"],
  ideas: ["Mining trend data…", "Architecting concept framework…", "Packaging your content idea…"],
};

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-card border border-card-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer pr-9"
        >
          {options.map(o => (
            <option key={o} value={o} className="bg-card">{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

async function callGenerateAPI(
  type: Tab,
  form: { niche: string; style: string; tone: string; platform: string; audience: string }
): Promise<string[]> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...form }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Server error ${res.status}`);
  }

  const data = await res.json() as { outputs: string[] };
  return data.outputs;
}

export default function Generator() {
  const [form, setForm] = useState({
    niche: niches[0],
    style: styles[0],
    tone: tones[0],
    platform: platforms[0],
    audience: audiences[0],
  });

  const [activeTab, setActiveTab] = useState<Tab>("hooks");
  const [outputs, setOutputs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const currentTab = tabConfig.find(t => t.id === activeTab)!;

  const handleGenerate = async (tab: Tab, isRetry = false) => {
    setActiveTab(tab);
    setLoading(true);
    setError(null);
    setGenerated(false);
    setOutputs([]);
    if (!isRetry) setRetryCount(0);

    const phrases = loadingPhrases[tab];
    let phraseIndex = 0;
    setLoadingPhrase(phrases[0]);
    const phraseInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setLoadingPhrase(phrases[phraseIndex]);
    }, 1200);

    try {
      const results = await callGenerateAPI(tab, form);
      setOutputs(results);
      setGenerated(true);
      trackGeneration(tab, form.niche, form.tone);
    } catch (err: any) {
      const message = err?.message ?? "Generation failed. Please try again.";
      setError(message);
      setGenerated(false);
    } finally {
      clearInterval(phraseInterval);
      setLoading(false);
      setLoadingPhrase("");
    }
  };

  const handleRetry = () => {
    setRetryCount(c => c + 1);
    handleGenerate(activeTab, true);
  };

  const handleRefresh = () => handleGenerate(activeTab);

  const handleCopy = (i: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 06</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">AI Content Generator</h1>
        <p className="text-muted-foreground text-sm">Configure your creative brief. Let the intelligence engine do the rest.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-2 space-y-5">
          <div className="luxury-card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Creative Brief</h2>
            </div>

            <SelectField label="Niche" options={niches} value={form.niche} onChange={v => setForm(f => ({ ...f, niche: v }))} />
            <SelectField label="Video Style" options={styles} value={form.style} onChange={v => setForm(f => ({ ...f, style: v }))} />
            <SelectField label="Tone" options={tones} value={form.tone} onChange={v => setForm(f => ({ ...f, tone: v }))} />
            <SelectField label="Platform" options={platforms} value={form.platform} onChange={v => setForm(f => ({ ...f, platform: v }))} />
            <SelectField label="Target Audience" options={audiences} value={form.audience} onChange={v => setForm(f => ({ ...f, audience: v }))} />

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Brief Summary</p>
              <div className="bg-muted/20 rounded-lg p-3 space-y-1">
                {[
                  ["Niche", form.niche],
                  ["Style", form.style],
                  ["Tone", form.tone],
                  ["Platform", form.platform],
                  ["Audience", form.audience],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <span className="text-xs text-primary font-mono truncate max-w-[60%] text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {tabConfig.map(tab => (
              <button
                key={tab.id}
                onClick={() => !loading && handleGenerate(tab.id)}
                disabled={loading}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === tab.id && (generated || error)
                    ? "bg-primary/10 border-primary/40"
                    : "bg-card border-card-border hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id && (generated || error) ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors"}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide leading-tight ${activeTab === tab.id && (generated || error) ? "text-primary" : "text-foreground"}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-3">
          <div className="luxury-card min-h-[480px] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground flex items-center gap-2">
                  <currentTab.icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{currentTab.label.replace("Generate ", "")}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{currentTab.desc}</p>
              </div>
              {generated && !loading && !error && (
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all duration-200 flex-shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              )}
            </div>

            <div className="flex-1 p-5">
              {/* Loading state */}
              {loading && (
                <div className="h-full min-h-64 flex flex-col items-center justify-center gap-5">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground font-medium tabular-nums min-w-[220px]">{loadingPhrase}</p>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">GPT-4o mini · {form.niche}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="h-1.5 w-10 bg-primary/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 250}ms` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="h-full min-h-64 flex flex-col items-center justify-center gap-4 text-center px-6">
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
                      onClick={() => setError(null)}
                      className="px-4 py-2 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
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

              {/* Output cards */}
              {!loading && !error && generated && outputs.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="live-dot" />
                    <p className="text-xs text-primary uppercase tracking-widest">
                      {outputs.length} outputs · {form.niche} · {form.tone}
                    </p>
                  </div>
                  {outputs.map((text, i) => (
                    <div
                      key={`${activeTab}-${i}`}
                      className="luxury-card p-5 group animate-in fade-in slide-in-from-bottom-2 duration-500"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">
                          Output {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-mono">
                          GPT-4o mini
                        </span>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed">{text}</p>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 bg-muted/30 border border-muted/50 rounded-full text-muted-foreground">{form.tone}</span>
                          <span className="text-xs px-2 py-0.5 bg-muted/30 border border-muted/50 rounded-full text-muted-foreground">{form.platform}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(i, text)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary transition-all duration-200 flex-shrink-0"
                        >
                          <Copy className="h-3 w-3" />
                          {copied === i ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
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
