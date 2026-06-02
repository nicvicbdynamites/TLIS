import { useState } from "react";
import { Sparkles, Copy, RefreshCw, Zap, Film, Lightbulb, MessageSquare, ChevronDown } from "lucide-react";

const niches = ["Quiet Luxury Lifestyle", "Dark Feminine Aesthetic", "Old Money Fashion", "Silent Wealth Signals", "Minimalist Wealth Flex", "Luxury Morning Routine", "Cinematic Travel", "Understated Opulence"];
const styles = ["Cinematic & Slow", "Fast-Cut Energy", "POV Narrative", "Day-in-the-Life", "Transformation Reveal", "Talking Head", "B-Roll Montage", "Luxury Unboxing"];
const tones = ["Aspirational", "Mysterious", "Authoritative", "Intimate", "Provocative", "Educational", "Stoic", "Empowering"];
const platforms = ["TikTok", "Instagram Reels", "YouTube Shorts", "Pinterest Idea Pins"];
const audiences = ["Luxury Aspirants 18–24", "Affluent Millennials 25–34", "High-Net-Worth 35–45", "Fashion-Forward Women", "Old Money Enthusiasts", "Minimalist Lifestyle Seekers"];

const hookOutputs = [
  "POV: You found the one brand that old money families have been quietly wearing for three generations — and nobody told you.",
  "The moment I stopped buying expensive things and started buying the right things, everything changed.",
  "I wore a $120 outfit in a five-star hotel lobby and the concierge whispered something I'll never forget.",
  "Things that signal real wealth — none of them have logos.",
  "She looked at my bag. Then at me. Then she said, 'I didn't think anyone else knew about that brand.'",
];

const captionOutputs = [
  "Wealth is not a display. It's a frequency. The right people recognise it without a label in sight. #QuietLuxury #OldMoney #LuxuryLifestyle",
  "There's a version of luxury that doesn't shout. It doesn't need to. This is that version. Save this for when you're ready to upgrade your eye. #SilentWealth #LuxuryAesthetic",
  "Everything in this frame cost less than a designer handbag. Everything about this frame looks like it didn't. The secret is taste — and taste is free. #MinimalistLuxury #GRWM",
  "Curated over time. Never purchased in a rush. This is what a wardrobe looks like when you stop following trends and start building a legacy. #CapsuleWardrobe #LuxuryFashion",
  "The most expensive thing I own is my standard. Because once you raise it, you can't unknow what quality actually feels like. #LuxuryMindset #EliteCreator",
];

const promptOutputs = [
  "Static shot: single product centered on aged white oak. One directional light from camera-left, long shadow extending right. No movement for 6 seconds. Color grade: pulled highlights, lifted blacks, warm midtones. The product is the entire story.",
  "Follow shot from behind: subject in camel coat, slow walk through a rain-slicked European street. Practical lights reflected in puddles. Score: single cello note sustained. Cut to black at 12 seconds. Never show the face.",
  "Overhead reveal: hands unwrap silk tissue paper in real time. The item is hidden until second 9. Extreme close-up. No sound except the rustle of fabric. Color grade: cream and charcoal only. End on freeze frame.",
  "Hyperlapse through the lobby of a heritage hotel at 6am — before anyone arrives. Empty grandeur. Gold sconces. Marble floors. Overlaid text: 'This is what mornings look like when you've decided.' Score: lo-fi piano.",
  "Mirror shot: subject adjusting a single detail — collar, cuff, ring — in silence. The reflection is slightly soft. Direct eye contact with camera for two full seconds before cutting. No narration. No text.",
];

const ideaOutputs = [
  "Series: '30 Days of One Color' — document a month wearing only one color palette, revealing how constraint forces taste. Post daily with consistent framing and score.",
  "Concept: 'The Brand Audit' — film yourself going through your wardrobe and removing everything with a visible logo. React to what's left. The reveal is the content.",
  "Viral format: 'Things I stopped buying when I got serious' — list-style with B-roll of luxury alternatives. End with your three non-negotiable standards.",
  "Evergreen idea: 'Dress like old money on £300/month' — monthly series documenting a specific budget with receipts, sourcing, and the final look side-by-side with archival references.",
  "Trend response: recreate a famous archival fashion moment using only current accessible pieces. Educational narration over the B-roll comparison. High share intent.",
];

type Tab = "hooks" | "captions" | "prompts" | "ideas";

const tabConfig: { id: Tab; label: string; icon: typeof Zap; outputPool: string[]; desc: string }[] = [
  { id: "hooks", label: "Generate Hooks", icon: Zap, outputPool: hookOutputs, desc: "Opening lines engineered for maximum 3-second retention" },
  { id: "captions", label: "Generate Captions", icon: MessageSquare, outputPool: captionOutputs, desc: "Platform-optimised captions that amplify reach" },
  { id: "prompts", label: "Cinematic Prompts", icon: Film, outputPool: promptOutputs, desc: "Director-level visual directions for your shoot" },
  { id: "ideas", label: "Viral Ideas", icon: Lightbulb, outputPool: ideaOutputs, desc: "Content concepts with proven viral architecture" },
];

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
  const [copied, setCopied] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  const currentTab = tabConfig.find(t => t.id === activeTab)!;

  const handleGenerate = (tab: Tab) => {
    setActiveTab(tab);
    setLoading(true);
    setGenerated(false);
    setOutputs([]);
    const pool = tabConfig.find(t => t.id === tab)!.outputPool;
    setTimeout(() => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
      setOutputs(shuffled);
      setLoading(false);
      setGenerated(true);
    }, 1400);
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
                onClick={() => handleGenerate(tab.id)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left group ${
                  activeTab === tab.id && generated
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-card border-card-border hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id && generated ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors"}`} />
                <span className="text-xs font-semibold uppercase tracking-wide leading-tight">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-3">
          <div className="luxury-card min-h-[480px] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground flex items-center gap-2">
                  <currentTab.icon className="h-4 w-4 text-primary" />
                  {currentTab.label.replace("Generate ", "")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{currentTab.desc}</p>
              </div>
              {generated && !loading && (
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all duration-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              )}
            </div>

            <div className="flex-1 p-5">
              {/* Loading state */}
              {loading && (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground font-medium">Intelligence engine running…</p>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Calibrating to your brief</p>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="h-1.5 w-8 bg-primary/20 rounded-full overflow-hidden"
                      >
                        <div
                          className="h-full bg-primary rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 200}ms` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && !generated && (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
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
              {!loading && generated && outputs.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="live-dot" />
                    <p className="text-xs text-primary uppercase tracking-widest">
                      {outputs.length} outputs generated for {form.niche}
                    </p>
                  </div>
                  {outputs.map((text, i) => (
                    <div
                      key={i}
                      className="luxury-card p-5 group"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start gap-3 justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">
                            Output {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-mono">
                            {Math.floor(Math.random() * 15 + 80)}% match
                          </span>
                        </div>
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
