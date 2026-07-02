import { useState } from "react";
import { Copy, Edit3, Check, Film } from "lucide-react";

const categories = ["All", "Dark Luxury", "Golden Hour", "Futuristic", "Minimalist", "Moody", "Cinematic"];

const prompts = [
  {
    id: 1,
    category: "Dark Luxury",
    title: "Midnight Penthouse",
    prompt: "Shot from low angle, looking up through floor-to-ceiling windows at a city skyline at 3am. Subject in a silk robe holding a crystal glass. Lighting: single warm lamp source, dramatic shadows. Color grade: desaturated teal shadows, warm amber highlights. Lens flare on reflective surfaces. 4K cinematic.",
    mood: "Mysterious",
    tags: ["luxury", "night", "aspirational"],
  },
  {
    id: 2,
    category: "Golden Hour",
    title: "Estate Walk",
    prompt: "Slow dolly shot following subject from behind, walking through manicured garden grounds at golden hour. Natural backlight creating silhouette halo. Wide depth of field, bokeh on garden details. Color grade: rich amber tones, lifted blacks. Anamorphic lens distortion on edges.",
    mood: "Aspirational",
    tags: ["outdoor", "estate", "warmth"],
  },
  {
    id: 3,
    category: "Futuristic",
    title: "Digital Oracle",
    prompt: "Subject seated in all-white environment, data streams projected across face and hands. Cool blue-white lighting. Fast-cut close-ups of eyes and fingertips. Glitch transitions between cuts. Color grade: clinical whites with electric blue accents. Sound design: subtle digital hum.",
    mood: "Powerful",
    tags: ["tech", "ai", "future"],
  },
  {
    id: 4,
    category: "Minimalist",
    title: "The Quiet Brand",
    prompt: "Overhead flat-lay of leather goods, aged paper, a single key. No logos visible. Negative space dominates the frame. Natural diffused window light only. No color correction beyond slight warmth. Product breathes. Camera completely still. 10-second hold.",
    mood: "Understated",
    tags: ["product", "still", "silent"],
  },
  {
    id: 5,
    category: "Moody",
    title: "Rain-Soaked City",
    prompt: "Handheld follow shot of subject in tailored coat walking through city rain. Reflections in puddles. Practical neon lights in background out of focus. Color grade: crushed shadows, desaturated midtones, only red and amber allowed color. Grain: 35mm emulation.",
    mood: "Cinematic",
    tags: ["urban", "rain", "noir"],
  },
  {
    id: 6,
    category: "Dark Luxury",
    title: "Vault Opening",
    prompt: "Extreme close-up of hands unwrapping tissue paper to reveal a single item. One sharp light source overhead. Silence except fabric rustle. Reveal happens at 80% through clip. Cut to wide shot of the item alone on velvet. Color grade: rich blacks, warm product highlight.",
    mood: "Anticipation",
    tags: ["reveal", "unboxing", "dramatic"],
  },
  {
    id: 7,
    category: "Cinematic",
    title: "Morning Ritual",
    prompt: "Sequence of 5 close-up shots: espresso brewing, leather watch being placed on wrist, sunlight through curtains, keys on marble, door closing. Each shot 2 seconds. No face shown. Score: single piano note per cut. Color grade: warm morning palette, film emulation.",
    mood: "Premium",
    tags: ["morning", "routine", "detail"],
  },
  {
    id: 8,
    category: "Golden Hour",
    title: "Mediterranean View",
    prompt: "Static shot from terrace overlooking sea. Subject in foreground slightly out of focus. Horizon perfectly level. Sun touching the water line. Light bouncing off water surfaces. Color grade: Santorini palette — warm whites, terracotta, deep blue. No zooming, let the light do the work.",
    mood: "Expansive",
    tags: ["travel", "sea", "luxury"],
  },
];

export default function Prompts() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [editing, setEditing] = useState<number | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<number | null>(null);

  const filtered = prompts.filter(p => activeCategory === "All" || p.category === activeCategory);

  const getText = (p: typeof prompts[0]) => editedPrompts[p.id] ?? p.prompt;

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const catColors: Record<string, string> = {
    "Dark Luxury": "text-primary bg-primary/10 border-primary/30",
    "Golden Hour": "text-chart-2 bg-chart-2/10 border-chart-2/30",
    "Futuristic": "text-chart-3 bg-chart-3/10 border-chart-3/30",
    "Minimalist": "text-muted-foreground bg-muted/40 border-muted/30",
    "Moody": "text-chart-4 bg-chart-4/10 border-chart-4/30",
    "Cinematic": "text-chart-5 bg-chart-5/10 border-chart-5/30",
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 03</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Cinematic Prompt Vault</h1>
        <p className="text-muted-foreground text-sm">Director-level visual prompts engineered for maximum production value on a phone.</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Film className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition duration-200 ${
              activeCategory === cat
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((p, i) => (
          <div
            key={p.id}
            className="luxury-card p-6 flex flex-col gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif font-semibold text-foreground text-lg">{p.title}</h3>
                <span className="text-xs text-muted-foreground">{p.mood} · {p.category}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${catColors[p.category] || "text-muted-foreground bg-muted/40 border-muted/30"}`}>
                {p.category}
              </span>
            </div>

            <div className="relative flex-1">
              {editing === p.id ? (
                <textarea
                  value={getText(p)}
                  onChange={e => setEditedPrompts(prev => ({ ...prev, [p.id]: e.target.value }))}
                  className="w-full bg-muted/30 border border-primary/30 rounded-lg p-3 text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:border-primary/60 min-h-[120px]"
                  rows={5}
                />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{getText(p)}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {p.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-muted/30 border border-muted/50 rounded-full text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setEditing(editing === p.id ? null : p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition duration-200"
              >
                {editing === p.id ? <><Check className="h-3 w-3" /> Done</> : <><Edit3 className="h-3 w-3" /> Edit</>}
              </button>
              <button
                onClick={() => handleCopy(p.id, getText(p))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary transition duration-200 ml-auto"
              >
                <Copy className="h-3 w-3" />
                {copied === p.id ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
