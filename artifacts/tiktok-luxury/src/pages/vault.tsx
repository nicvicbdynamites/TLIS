import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  Database, Star, Copy, Trash2, Plus, Search, X, Check, ChevronDown,
  FolderOpen, Tag, Sparkles, TrendingUp, Clock, Grid3X3, List,
  Download, BookOpen, Cpu, ArrowRight, Filter, SortAsc,
} from "lucide-react";
import {
  loadVault, saveVault, createVaultEntry, addVaultEntry, updateVaultEntry,
  deleteVaultEntry, toggleFavourite, recordView, addCollection, deleteCollection,
  filterAndSortEntries, computeVaultStats, getAllNiches, getAllTones, getAllTags,
  formatRelativeTime, scoreLabel, scoreColor, DEFAULT_FILTERS,
  CONTENT_TYPE_LABELS, PLATFORM_SHORT, COLLECTION_COLOR_STYLES,
  type VaultEntry, type VaultCollection, type VaultFilters,
  type ContentType, type VaultPlatform, type CollectionColor, type SortOption,
} from "@/lib/vault";
import {
  syncVaultWithCloud, upsertVaultEntryToCloud, deleteVaultEntryFromCloud,
  upsertVaultCollectionToCloud, deleteVaultCollectionFromCloud,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────

const TYPE_ACCENT: Record<ContentType, string> = {
  hook:     "bg-primary",
  caption:  "bg-amber-400",
  script:   "bg-indigo-400",
  idea:     "bg-emerald-400",
  hashtags: "bg-rose-400",
  thread:   "bg-sky-400",
  bio:      "bg-violet-400",
  ad:       "bg-orange-400",
  other:    "bg-slate-400",
};

const TYPE_BADGE: Record<ContentType, string> = {
  hook:     "text-primary border-primary/30 bg-primary/10",
  caption:  "text-amber-400 border-amber-400/30 bg-amber-400/10",
  script:   "text-indigo-400 border-indigo-400/30 bg-indigo-400/10",
  idea:     "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  hashtags: "text-rose-400 border-rose-400/30 bg-rose-400/10",
  thread:   "text-sky-400 border-sky-400/30 bg-sky-400/10",
  bio:      "text-violet-400 border-violet-400/30 bg-violet-400/10",
  ad:       "text-orange-400 border-orange-400/30 bg-orange-400/10",
  other:    "text-slate-400 border-slate-400/30 bg-slate-400/10",
};

const CONTENT_TYPES: ContentType[] = ["hook","caption","script","idea","hashtags","thread","bio","ad","other"];
const PLATFORMS: VaultPlatform[]   = ["TikTok","Instagram","YouTube","Pinterest","Twitter","All"];
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",     label: "Newest First" },
  { value: "oldest",     label: "Oldest First" },
  { value: "score",      label: "AI Score" },
  { value: "viral",      label: "Viral Potential" },
  { value: "accessed",   label: "Recently Viewed" },
  { value: "favourites", label: "Favourites First" },
];
const COL_COLORS: CollectionColor[] = ["gold","amber","rose","indigo","emerald","slate"];

// ──────────────────────────────────────────────
//  Small shared components
// ──────────────────────────────────────────────

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-7 text-right">{value}</span>
    </div>
  );
}

function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 border border-primary/20 text-primary">
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-primary/60 transition-colors">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: typeof Database }) {
  return (
    <div className="luxury-card p-4 md:p-5 flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-xl md:text-2xl font-serif font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Entry card
// ──────────────────────────────────────────────

function EntryCard({
  entry, isSelected, onSelect, onStar, onCopy, copied,
}: {
  entry: VaultEntry;
  isSelected: boolean;
  onSelect: () => void;
  onStar: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const scoreClr = entry.aiScore >= 70 ? "bg-emerald-500" : entry.aiScore >= 40 ? "bg-amber-500" : "bg-slate-500";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "luxury-card relative overflow-hidden cursor-pointer transition-all duration-200 group",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        isSelected && "border-primary/50 bg-primary/5 shadow-primary/10 shadow-lg"
      )}
    >
      {/* Left type accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", TYPE_ACCENT[entry.type])} />

      <div className="p-4 pl-5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", TYPE_BADGE[entry.type])}>
              {CONTENT_TYPE_LABELS[entry.type]}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-muted/40 bg-muted/20 text-muted-foreground">
              {PLATFORM_SHORT[entry.platform]}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={cn(
              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
              entry.aiScore >= 70 ? "text-emerald-400 bg-emerald-400/10" :
              entry.aiScore >= 40 ? "text-amber-400 bg-amber-400/10" :
              "text-muted-foreground bg-muted/20"
            )}>
              {entry.aiScore}
            </span>
          </div>
        </div>

        {/* Content preview */}
        <p className="text-sm text-foreground line-clamp-3 leading-relaxed mb-3">
          {entry.content}
        </p>

        {/* Score bar */}
        <div className="mb-3">
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", scoreClr)} style={{ width: `${entry.aiScore}%` }} />
          </div>
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {entry.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-primary/80">
                {t}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground font-mono">{formatRelativeTime(entry.createdAt)}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); onStar(); }}
              className={cn("p-1.5 rounded transition-colors", entry.isFavourite ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              <Star className={cn("h-3.5 w-3.5", entry.isFavourite && "fill-current")} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCopy(); }}
              className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Detail panel
// ──────────────────────────────────────────────

function DetailPanel({
  entry, collections, onClose, onStar, onCopy, copied, onTagAdd, onTagRemove,
  onCollectionChange, onDelete,
}: {
  entry: VaultEntry;
  collections: VaultCollection[];
  onClose: () => void;
  onStar: () => void;
  onCopy: () => void;
  copied: boolean;
  onTagAdd: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  onCollectionChange: (id: string | null) => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<"content" | "intel" | "prompt">("content");
  const [tagInput, setTagInput] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      onTagAdd(tagInput.trim().toLowerCase());
      setTagInput("");
    }
  };

  const exportMarkdown = () => {
    const md = `# ${entry.title}\n\n**Type:** ${CONTENT_TYPE_LABELS[entry.type]}\n**Platform:** ${entry.platform}\n**Niche:** ${entry.niche}\n**Tone:** ${entry.tone}\n**AI Score:** ${entry.aiScore}/100\n\n---\n\n${entry.content}\n`;
    navigator.clipboard.writeText(md);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-${entry.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-card border border-card-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start gap-3">
        <div className={cn("w-1 self-stretch rounded-full flex-shrink-0", TYPE_ACCENT[entry.type])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", TYPE_BADGE[entry.type])}>
              {CONTENT_TYPE_LABELS[entry.type]}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{entry.platform}</span>
          </div>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{entry.title}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{formatRelativeTime(entry.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onStar} className={cn("p-1.5 rounded transition-colors", entry.isFavourite ? "text-primary" : "text-muted-foreground hover:text-primary")}>
            <Star className={cn("h-4 w-4", entry.isFavourite && "fill-current")} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-border">
        {(["content", "intel", "prompt"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-[11px] uppercase tracking-widest font-medium transition-colors",
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "content" ? "Content" : t === "intel" ? "Intelligence" : "Prompt"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "content" && (
          <>
            {/* Full content */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Content</p>
              <div className="bg-black/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.content}</p>
              </div>
            </div>

            {/* Copy + Export */}
            <div className="flex gap-2">
              <button
                onClick={onCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/20 transition-all"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={exportMarkdown}
                className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-all text-xs"
                title="Copy as Markdown"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={exportJSON}
                className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-all text-xs"
                title="Download JSON"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tags editor */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {entry.tags.map(t => (
                  <TagPill key={t} tag={t} onRemove={() => onTagRemove(t)} />
                ))}
              </div>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag — press Enter"
                className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
              />
            </div>

            {/* Collection */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Collection</p>
              <div className="relative">
                <select
                  value={entry.collectionId ?? ""}
                  onChange={e => onCollectionChange(e.target.value || null)}
                  className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer pr-8"
                >
                  <option value="">No collection</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {tab === "intel" && (
          <>
            {/* Scores */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">AI Score</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground">AI Quality Score</span>
                    <span className={cn("text-xs font-semibold", scoreColor(entry.aiScore))}>
                      {entry.aiScore}/100 — {scoreLabel(entry.aiScore)}
                    </span>
                  </div>
                  <ScoreBar
                    value={entry.aiScore}
                    color={entry.aiScore >= 70 ? "bg-gradient-to-r from-primary to-amber-400" :
                           entry.aiScore >= 40 ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-slate-500"}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground">Viral Potential</span>
                    <span className={cn("text-xs font-semibold", scoreColor(entry.viralPotential))}>
                      {entry.viralPotential}/100
                    </span>
                  </div>
                  <ScoreBar
                    value={entry.viralPotential}
                    color={entry.viralPotential >= 70 ? "bg-gradient-to-r from-rose-500 to-pink-400" :
                           entry.viralPotential >= 40 ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-slate-500"}
                  />
                </div>
              </div>
            </div>

            {/* Metadata grid */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Metadata</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Niche", entry.niche],
                  ["Platform", entry.platform],
                  ["Tone", entry.tone],
                  ["Model", entry.model],
                  ["Source", entry.source],
                  ["Views", String(entry.views)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-black/20 rounded-lg p-2.5 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                    <p className="text-xs text-foreground font-medium mt-0.5 truncate">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic keywords */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Semantic Keywords</p>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border",
                  entry.embeddingReady
                    ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                    : "text-muted-foreground border-muted/30 bg-muted/10"
                )}>
                  {entry.embeddingReady ? "Vector-Ready" : "Indexing..."}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entry.searchKeywords.map(kw => (
                  <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/20 border border-muted/30 text-muted-foreground font-mono">
                    {kw}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
                Keywords prepared for future vector database embedding and semantic search.
              </p>
            </div>

            {/* AI Memory architecture note */}
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-3.5 w-3.5 text-primary/70" />
                <p className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold">AI Memory Architecture</p>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                This entry is indexed in your personal intelligence graph. Future AI calls will reference your vault to improve generation quality, personalisation, and campaign consistency.
              </p>
            </div>
          </>
        )}

        {tab === "prompt" && (
          <>
            {/* Prompt template */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Prompt Used</p>
              {entry.prompt ? (
                <div className="bg-black/30 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">{entry.prompt}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No prompt recorded for this entry.</p>
              )}
            </div>

            {entry.promptTemplate && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Template Pattern</p>
                <div className="bg-black/20 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">{entry.promptTemplate}</p>
                </div>
              </div>
            )}

            {/* Reusable campaign readiness */}
            <div className="bg-black/20 rounded-lg p-4 border border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Campaign Readiness</p>
              <div className="space-y-2">
                {[
                  { label: "Content saved", done: true },
                  { label: "Tags applied", done: entry.tags.length > 0 },
                  { label: "Collection assigned", done: entry.collectionId !== null },
                  { label: "Vector-indexed", done: entry.embeddingReady },
                  { label: "Team sharing (coming soon)", done: false },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn("h-3.5 w-3.5 rounded-full flex items-center justify-center flex-shrink-0", done ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-muted/20 border border-muted/30")}>
                      {done && <Check className="h-2 w-2 text-emerald-400" />}
                    </div>
                    <span className={cn("text-xs", done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <div className="p-4 border-t border-border">
        {confirmDelete ? (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-xs hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={onDelete} className="flex-1 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all">
              Confirm Delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 border border-transparent transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Entry
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  New Entry Modal
// ──────────────────────────────────────────────

function NewEntryModal({
  collections, onSave, onClose,
}: {
  collections: VaultCollection[];
  onSave: (entry: VaultEntry) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    content: "", title: "", type: "hook" as ContentType,
    platform: "TikTok" as VaultPlatform, niche: "", tone: "",
    collectionId: "" as string, tagStr: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.content.trim()) return;
    const tags = form.tagStr.split(",").map(t => t.trim()).filter(Boolean);
    const entry = createVaultEntry({
      content: form.content.trim(),
      title: form.title.trim() || undefined,
      type: form.type,
      platform: form.platform,
      niche: form.niche || "General",
      tone: form.tone || "Neutral",
      source: "manual",
      tags,
      collectionId: form.collectionId || null,
    });
    onSave(entry);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">New Entry</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Content *</label>
            <textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="Paste or type your content..."
              rows={4}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Title (optional — auto-generated)</label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["type","platform"] as const).map(field => (
              <div key={field}>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">{field}</label>
                <div className="relative">
                  <select
                    value={form[field]}
                    onChange={e => set(field, e.target.value)}
                    className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 pr-8 cursor-pointer"
                  >
                    {(field === "type" ? CONTENT_TYPES : PLATFORMS).map(v => (
                      <option key={v} value={v} className="bg-card">{field === "type" ? CONTENT_TYPE_LABELS[v as ContentType] : v}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Niche</label>
              <input value={form.niche} onChange={e => set("niche", e.target.value)} placeholder="e.g. Quiet Luxury" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Tone</label>
              <input value={form.tone} onChange={e => set("tone", e.target.value)} placeholder="e.g. Aspirational" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Tags (comma-separated)</label>
            <input value={form.tagStr} onChange={e => set("tagStr", e.target.value)} placeholder="luxury, hook, viral, campaign-1" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
          </div>
          {collections.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Collection</label>
              <div className="relative">
                <select value={form.collectionId} onChange={e => set("collectionId", e.target.value)} className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 pr-8 cursor-pointer">
                  <option value="" className="bg-card">No collection</option>
                  {collections.map(c => <option key={c.id} value={c.id} className="bg-card">{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.content.trim()} className="flex-1 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Save to Vault
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  New Collection Modal
// ──────────────────────────────────────────────

function NewCollectionModal({ onSave, onClose }: { onSave: (data: Omit<VaultCollection, "id" | "createdAt">) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CollectionColor>("gold");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">New Collection</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 Luxury Campaign" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this collection for?" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">Color</label>
            <div className="flex gap-2">
              {COL_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("h-7 w-7 rounded-full transition-all", COLLECTION_COLOR_STYLES[c].dot, color === c ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110" : "opacity-60 hover:opacity-100")}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">Cancel</button>
          <button onClick={() => name.trim() && onSave({ name: name.trim(), description, color, icon: "folder" })} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-all disabled:opacity-40">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Main page
// ──────────────────────────────────────────────

export default function VaultPage() {
  const [state, setState] = useState(() => loadVault());
  const [selected, setSelected] = useState<VaultEntry | null>(null);
  const [filters, setFilters] = useState<VaultFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [synced, setSynced] = useState(false);
  const didSync = useRef(false);

  // Persist to localStorage on every state change
  useEffect(() => { saveVault(state); }, [state]);

  // Cloud sync on mount
  useEffect(() => {
    if (didSync.current) return;
    didSync.current = true;
    syncVaultWithCloud(state).then(({ state: merged, synced: ok }) => {
      if (ok) { setState(merged); setSynced(true); }
    }).catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selected entry fresh after state changes
  useEffect(() => {
    if (selected) {
      const fresh = state.entries.find(e => e.id === selected.id);
      if (fresh) setSelected(fresh);
      else setSelected(null);
    }
  }, [state.entries]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats     = useMemo(() => computeVaultStats(state), [state]);
  const filtered  = useMemo(() => filterAndSortEntries(state.entries, filters, state.recentlyViewed), [state, filters]);
  const niches    = useMemo(() => getAllNiches(state.entries), [state.entries]);
  const tones     = useMemo(() => getAllTones(state.entries), [state.entries]);

  const activeFilterCount = [
    filters.type !== "all", filters.platform !== "all", !!filters.niche, !!filters.tone,
  ].filter(Boolean).length;

  // ── Handlers ──

  const mutate = useCallback((next: typeof state) => setState(next), []);

  const handleStar = useCallback((id: string) => {
    const next = toggleFavourite(state, id);
    mutate(next);
    const entry = next.entries.find(e => e.id === id);
    if (entry) upsertVaultEntryToCloud(entry).catch(() => null);
  }, [state, mutate]);

  const handleCopy = useCallback((entry: VaultEntry) => {
    navigator.clipboard.writeText(entry.content);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2500);
    // Record view
    const next = recordView(state, entry.id);
    mutate(next);
  }, [state, mutate]);

  const handleSelect = useCallback((entry: VaultEntry) => {
    setSelected(prev => prev?.id === entry.id ? null : entry);
    const next = recordView(state, entry.id);
    mutate(next);
  }, [state, mutate]);

  const handleDelete = useCallback((id: string) => {
    const next = deleteVaultEntry(state, id);
    mutate(next);
    setSelected(null);
    deleteVaultEntryFromCloud(id).catch(() => null);
  }, [state, mutate]);

  const handleTagAdd = useCallback((id: string, tag: string) => {
    const entry = state.entries.find(e => e.id === id);
    if (!entry || entry.tags.includes(tag)) return;
    const next = updateVaultEntry(state, id, { tags: [...entry.tags, tag] });
    mutate(next);
    const updated = next.entries.find(e => e.id === id);
    if (updated) upsertVaultEntryToCloud(updated).catch(() => null);
  }, [state, mutate]);

  const handleTagRemove = useCallback((id: string, tag: string) => {
    const entry = state.entries.find(e => e.id === id);
    if (!entry) return;
    const next = updateVaultEntry(state, id, { tags: entry.tags.filter(t => t !== tag) });
    mutate(next);
    const updated = next.entries.find(e => e.id === id);
    if (updated) upsertVaultEntryToCloud(updated).catch(() => null);
  }, [state, mutate]);

  const handleCollectionChange = useCallback((id: string, collectionId: string | null) => {
    const next = updateVaultEntry(state, id, { collectionId });
    mutate(next);
    const updated = next.entries.find(e => e.id === id);
    if (updated) upsertVaultEntryToCloud(updated).catch(() => null);
  }, [state, mutate]);

  const handleNewEntry = useCallback((entry: VaultEntry) => {
    const next = addVaultEntry(state, entry);
    mutate(next);
    setShowNewEntry(false);
    upsertVaultEntryToCloud(entry).catch(() => null);
  }, [state, mutate]);

  const handleNewCollection = useCallback((data: Omit<VaultCollection, "id" | "createdAt">) => {
    const next = addCollection(state, data);
    mutate(next);
    setShowNewCollection(false);
    const newCol = next.collections[next.collections.length - 1];
    if (newCol) upsertVaultCollectionToCloud(newCol).catch(() => null);
  }, [state, mutate]);

  const handleDeleteCollection = useCallback((id: string) => {
    const next = deleteCollection(state, id);
    mutate(next);
    if (filters.collectionId === id) setFilters(f => ({ ...f, collectionId: "all" }));
    deleteVaultCollectionFromCloud(id).catch(() => null);
  }, [state, filters.collectionId, mutate]);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const setFilter = (k: keyof VaultFilters, v: string) => setFilters(f => ({ ...f, [k]: v }));

  // ── Render ──

  const hasDetail = selected !== null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">MODULE 09</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">Intelligence Vault</h1>
          <p className="text-muted-foreground text-sm">
            Your permanent AI creative intelligence database. Every output, scored, indexed, and searchable.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {synced && (
            <span className="hidden md:flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CLOUD SYNCED
            </span>
          )}
          <button
            onClick={() => setShowNewCollection(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:border-primary/30 hover:text-primary text-xs transition-all"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Collection
          </button>
          <button
            onClick={() => setShowNewEntry(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            New Entry
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Entries" value={stats.totalEntries} sub={`${stats.recentCount} this week`} icon={Database} />
        <StatCard label="Starred" value={stats.totalFavourites} sub="favourited entries" icon={Star} />
        <StatCard label="Collections" value={stats.totalCollections} sub={stats.topNiche !== "—" ? `Top: ${stats.topNiche}` : "No collections yet"} icon={FolderOpen} />
        <StatCard label="Avg AI Score" value={stats.totalEntries > 0 ? `${stats.avgScore}/100` : "—"} sub={stats.totalEntries > 0 ? scoreLabel(stats.avgScore) : "Generate content to start"} icon={Sparkles} />
      </div>

      {/* Collections rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {/* Built-in views */}
        {[
          { id: "all",     label: "All Entries", icon: Database },
          { id: "starred", label: "Starred",     icon: Star },
          { id: "recent",  label: "Recent",      icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilter("collectionId", id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0",
              filters.collectionId === id
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
            {id === "all" && state.entries.length > 0 && (
              <span className="ml-0.5 text-[10px] font-mono opacity-60">{state.entries.length}</span>
            )}
          </button>
        ))}

        {/* User collections */}
        {state.collections.map(col => {
          const styles = COLLECTION_COLOR_STYLES[col.color];
          const count  = state.entries.filter(e => e.collectionId === col.id).length;
          return (
            <div key={col.id} className="relative group flex-shrink-0">
              <button
                onClick={() => setFilter("collectionId", col.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                  filters.collectionId === col.id
                    ? `${styles.bg} ${styles.border} ${styles.text}`
                    : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", styles.dot)} />
                {col.name}
                {count > 0 && <span className="text-[10px] font-mono opacity-60">{count}</span>}
              </button>
              <button
                onClick={() => handleDeleteCollection(col.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive/80 text-white items-center justify-center hidden group-hover:flex"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}

        {/* New collection */}
        <button
          onClick={() => setShowNewCollection(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-dashed border-border hover:border-primary/30 hover:text-primary transition-all whitespace-nowrap flex-shrink-0"
        >
          <Plus className="h-3 w-3" />
          Collection
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder="Search content, tags, keywords, prompts..."
            className="w-full bg-card border border-card-border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {filters.search && (
            <button onClick={() => setFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs transition-all",
              showFilters || activeFilterCount > 0
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-card-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-background flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="relative">
            <SortAsc className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={filters.sort}
              onChange={e => setFilter("sort", e.target.value)}
              className="appearance-none bg-card border border-card-border rounded-xl pl-8 pr-8 py-2.5 text-xs text-muted-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-card">{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-card border border-card-border rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2.5 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2.5 transition-colors", viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter drawer */}
      {showFilters && (
        <div className="bg-card border border-card-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Type */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Type</label>
            <div className="relative">
              <select value={filters.type} onChange={e => setFilter("type", e.target.value)} className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 pr-7 cursor-pointer">
                <option value="all" className="bg-card">All Types</option>
                {CONTENT_TYPES.map(t => <option key={t} value={t} className="bg-card">{CONTENT_TYPE_LABELS[t]}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {/* Platform */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Platform</label>
            <div className="relative">
              <select value={filters.platform} onChange={e => setFilter("platform", e.target.value)} className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 pr-7 cursor-pointer">
                <option value="all" className="bg-card">All Platforms</option>
                {PLATFORMS.map(p => <option key={p} value={p} className="bg-card">{p}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {/* Niche */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Niche</label>
            <div className="relative">
              <select value={filters.niche} onChange={e => setFilter("niche", e.target.value)} className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 pr-7 cursor-pointer">
                <option value="" className="bg-card">All Niches</option>
                {niches.map(n => <option key={n} value={n} className="bg-card">{n}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {/* Tone */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Tone</label>
            <div className="relative">
              <select value={filters.tone} onChange={e => setFilter("tone", e.target.value)} className="w-full appearance-none bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 pr-7 cursor-pointer">
                <option value="" className="bg-card">All Tones</option>
                {tones.map(t => <option key={t} value={t} className="bg-card">{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main layout: grid + optional detail panel */}
      <div className={cn("flex gap-6", hasDetail && "lg:grid lg:grid-cols-[1fr_380px]")}>
        {/* Entry grid/list */}
        <div className="flex-1 min-w-0">
          {state.entries.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/5 border border-primary/15 flex items-center justify-center mb-6">
                <Database className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">Your vault is empty</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
                Save AI-generated content to build your permanent intelligence database. Every hook, caption, and script — scored, tagged, and searchable forever.
              </p>
              <div className="flex gap-3">
                <Link href="/generator">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-all">
                    <Sparkles className="h-4 w-4" />
                    Generate Content
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <button
                  onClick={() => setShowNewEntry(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:border-primary/30 hover:text-primary transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Manually
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            /* No results */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="h-12 w-12 text-primary/20 mb-4" />
              <h3 className="text-lg font-serif text-foreground mb-2">No entries match</h3>
              <p className="text-muted-foreground text-sm mb-4">Try adjusting your search or filters.</p>
              <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                <X className="h-3 w-3" /> Clear filters
              </button>
            </div>
          ) : (
            <div className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                : "flex flex-col gap-3",
              hasDetail && "xl:grid-cols-1"
            )}>
              {filtered.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  isSelected={selected?.id === entry.id}
                  onSelect={() => handleSelect(entry)}
                  onStar={() => handleStar(entry.id)}
                  onCopy={() => handleCopy(entry)}
                  copied={copiedId === entry.id}
                />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground/40 font-mono mt-6">
              {filtered.length} of {state.entries.length} entries
              {activeFilterCount > 0 && " · filters active"}
            </p>
          )}
        </div>

        {/* Detail panel — hidden on mobile (use selected indicator + scroll instead) */}
        {hasDetail && selected && (
          <div className="hidden lg:block">
            <div className="sticky top-4" style={{ maxHeight: "calc(100vh - 8rem)", overflowY: "auto" }}>
              <DetailPanel
                entry={selected}
                collections={state.collections}
                onClose={() => setSelected(null)}
                onStar={() => handleStar(selected.id)}
                onCopy={() => handleCopy(selected)}
                copied={copiedId === selected.id}
                onTagAdd={tag => handleTagAdd(selected.id, tag)}
                onTagRemove={tag => handleTagRemove(selected.id, tag)}
                onCollectionChange={id => handleCollectionChange(selected.id, id)}
                onDelete={() => handleDelete(selected.id)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile detail sheet */}
      {hasDetail && selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden max-h-[80vh] overflow-y-auto rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <DetailPanel
            entry={selected}
            collections={state.collections}
            onClose={() => setSelected(null)}
            onStar={() => handleStar(selected.id)}
            onCopy={() => handleCopy(selected)}
            copied={copiedId === selected.id}
            onTagAdd={tag => handleTagAdd(selected.id, tag)}
            onTagRemove={tag => handleTagRemove(selected.id, tag)}
            onCollectionChange={id => handleCollectionChange(selected.id, id)}
            onDelete={() => handleDelete(selected.id)}
          />
        </div>
      )}

      {/* Modals */}
      {showNewEntry && (
        <NewEntryModal
          collections={state.collections}
          onSave={handleNewEntry}
          onClose={() => setShowNewEntry(false)}
        />
      )}
      {showNewCollection && (
        <NewCollectionModal
          onSave={handleNewCollection}
          onClose={() => setShowNewCollection(false)}
        />
      )}
    </div>
  );
}
