import { useState } from "react";
import { Copy, Bookmark, BookmarkCheck, Search, Filter, Sparkles } from "lucide-react";
import { Link } from "wouter";

const categories = ["All", "Emotional", "Curiosity", "Shock", "Luxury", "Identity", "FOMO"];

const hooks = [
  { id: 1, text: "POV: You found the secret luxury brand that old money families have been hiding for decades…", category: "Luxury", viralScore: 97, uses: "12.4K" },
  { id: 2, text: "I spent 30 days living like a billionaire on $500 and nobody noticed the difference…", category: "Shock", viralScore: 94, uses: "9.8K" },
  { id: 3, text: "The reason quiet luxury people never talk about their money…", category: "Curiosity", viralScore: 91, uses: "8.2K" },
  { id: 4, text: "Watch what happens when I wear a $12 outfit from a brand nobody knows in SoHo…", category: "FOMO", viralScore: 89, uses: "7.6K" },
  { id: 5, text: "She looked at my bag and whispered — 'that's real money'", category: "Emotional", viralScore: 96, uses: "11.3K" },
  { id: 6, text: "Things that signal wealth without showing it (most people miss all of these)…", category: "Curiosity", viralScore: 93, uses: "10.1K" },
  { id: 7, text: "The $80 jacket that made people think I was a hotel guest…", category: "Shock", viralScore: 88, uses: "6.9K" },
  { id: 8, text: "Identity check: you're not going to believe what my morning routine says about me…", category: "Identity", viralScore: 85, uses: "5.4K" },
  { id: 9, text: "Old money doesn't buy logos. Here's what they buy instead…", category: "Luxury", viralScore: 95, uses: "13.7K" },
  { id: 10, text: "I found a brand that dresses CEOs for $200 — and nobody talks about it…", category: "FOMO", viralScore: 90, uses: "7.8K" },
  { id: 11, text: "This is the moment I realized rich people dress completely differently…", category: "Emotional", viralScore: 87, uses: "5.9K" },
  { id: 12, text: "Stop spending on trends. Real style doesn't expire…", category: "Identity", viralScore: 83, uses: "4.2K" },
  { id: 13, text: "The hotel concierge upgraded me to a suite and I was wearing this…", category: "Shock", viralScore: 92, uses: "9.1K" },
  { id: 14, text: "Why the wealthiest people I know all shop the same three places…", category: "Curiosity", viralScore: 89, uses: "6.8K" },
  { id: 15, text: "This will ruin how you look at expensive clothing forever…", category: "Shock", viralScore: 91, uses: "8.4K" },
];

export default function Hooks() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [saved, setSaved] = useState<number[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const filtered = hooks.filter(h => {
    const matchCat = activeCategory === "All" || h.category === activeCategory;
    const matchSearch = h.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleSave = (id: number) => {
    setSaved(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 02</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Viral Hooks Database</h1>
          <p className="text-muted-foreground text-sm">Battle-tested opening lines engineered for maximum retention and virality.</p>
        </div>
        <Link href="/generator?tab=hooks">
          <span className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-200 cursor-pointer flex-shrink-0">
            <Sparkles className="h-4 w-4" />
            Generate AI Hooks
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hooks..."
            className="w-full bg-card border border-card-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((hook, i) => (
          <div
            key={hook.id}
            className="luxury-card p-5 group"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                hook.category === "Luxury" ? "text-primary bg-primary/10 border-primary/30" :
                hook.category === "Shock" ? "text-destructive bg-destructive/10 border-destructive/30" :
                hook.category === "Curiosity" ? "text-chart-2 bg-chart-2/10 border-chart-2/30" :
                hook.category === "Emotional" ? "text-chart-5 bg-chart-5/10 border-chart-5/30" :
                "text-muted-foreground bg-muted/40 border-muted/30"
              }`}>
                {hook.category}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-mono text-primary">VS {hook.viralScore}</span>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed mb-4 min-h-[3.5rem]">
              "{hook.text}"
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{hook.uses} creators used this</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSave(hook.id)}
                  className="p-1.5 rounded-md hover:bg-primary/10 transition-colors"
                  title="Save hook"
                >
                  {saved.includes(hook.id)
                    ? <BookmarkCheck className="h-4 w-4 text-primary" />
                    : <Bookmark className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  }
                </button>
                <button
                  onClick={() => handleCopy(hook.id, hook.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary transition-all duration-200"
                >
                  <Copy className="h-3 w-3" />
                  {copied === hook.id ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="luxury-card p-16 flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground uppercase tracking-widest text-sm">No hooks match your search</p>
          <button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-4 text-xs text-primary hover:text-primary/80 transition-colors">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
