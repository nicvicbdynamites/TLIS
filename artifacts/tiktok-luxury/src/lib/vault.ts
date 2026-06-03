// Inline device ID — avoids circular import with supabase.ts
function getDeviceId(): string {
  try {
    const key = "tlis_device_id";
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  } catch { return "anon"; }
}

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export type ContentType =
  | "hook" | "caption" | "script" | "idea"
  | "hashtags" | "thread" | "bio" | "ad" | "other";

export type VaultPlatform =
  | "TikTok" | "Instagram" | "YouTube" | "Pinterest" | "Twitter" | "All";

export type SortOption =
  | "newest" | "oldest" | "score" | "viral" | "accessed" | "favourites";

export type CollectionColor =
  | "gold" | "amber" | "rose" | "indigo" | "emerald" | "slate";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  hook: "Hook",
  caption: "Caption",
  script: "Script",
  idea: "Idea",
  hashtags: "Hashtags",
  thread: "Thread",
  bio: "Bio",
  ad: "Ad Copy",
  other: "Other",
};

export const PLATFORM_SHORT: Record<VaultPlatform, string> = {
  TikTok: "TK",
  Instagram: "IG",
  YouTube: "YT",
  Pinterest: "PIN",
  Twitter: "TW",
  All: "ALL",
};

export const COLLECTION_COLOR_STYLES: Record<CollectionColor, { bg: string; border: string; text: string; dot: string }> = {
  gold:    { bg: "bg-primary/10",     border: "border-primary/30",     text: "text-primary",      dot: "bg-primary" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",    dot: "bg-amber-400" },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/30",    text: "text-rose-400",     dot: "bg-rose-400" },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  text: "text-indigo-400",   dot: "bg-indigo-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400",  dot: "bg-emerald-400" },
  slate:   { bg: "bg-slate-500/10",   border: "border-slate-500/30",   text: "text-slate-400",    dot: "bg-slate-400" },
};

export interface VaultCollection {
  id: string;
  name: string;
  description: string;
  color: CollectionColor;
  icon: string;
  createdAt: string;
}

export interface VaultEntry {
  id: string;

  // Content
  title: string;
  content: string;
  prompt: string;
  promptTemplate: string;

  // Classification
  type: ContentType;
  niche: string;
  platform: VaultPlatform;
  tone: string;

  // Source / AI metadata
  source: "generator" | "manual" | "import";
  model: string;

  // Scoring
  aiScore: number;         // 0–100
  viralPotential: number;  // 0–100

  // User interaction
  isFavourite: boolean;
  tags: string[];
  collectionId: string | null;
  views: number;

  // Semantic search preparation (vector-DB-ready)
  searchKeywords: string[];
  embeddingReady: boolean;

  // Campaign / team structure (auth upgrade path)
  campaignId: string | null;
  deviceId: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;
}

export interface VaultStats {
  totalEntries: number;
  totalFavourites: number;
  totalCollections: number;
  avgScore: number;
  topNiche: string;
  topPlatform: string;
  recentCount: number;
}

export interface VaultState {
  entries: VaultEntry[];
  collections: VaultCollection[];
  recentlyViewed: string[]; // max 10 entry IDs
}

export interface VaultFilters {
  search: string;
  type: ContentType | "all";
  platform: VaultPlatform | "all";
  niche: string;
  tone: string;
  collectionId: string | "all" | "starred" | "recent";
  sort: SortOption;
}

export const DEFAULT_FILTERS: VaultFilters = {
  search: "",
  type: "all",
  platform: "all",
  niche: "",
  tone: "",
  collectionId: "all",
  sort: "newest",
};

// ──────────────────────────────────────────────
//  AI Scoring
// ──────────────────────────────────────────────

const POWER_WORDS = [
  "secret", "proven", "luxury", "exclusive", "viral", "shocking", "truth",
  "never", "always", "instantly", "transform", "reveal", "unlock", "hidden",
  "rare", "elite", "ultimate", "ancient", "forbidden", "exposed", "private",
];

const EMOTIONAL_WORDS = [
  "love", "hate", "fear", "amazing", "terrible", "incredible", "broken",
  "fixed", "changed", "obsessed", "terrified", "desperate", "thrilled", "haunted",
];

const HIGH_VIRAL_NICHES = [
  "luxury", "fashion", "travel", "finance", "wellness", "beauty", "lifestyle",
  "old money", "quiet luxury", "dark feminine",
];

export function computeAiScore(content: string, type: ContentType): number {
  if (!content) return 0;
  let score = 0;
  const lower = content.toLowerCase();
  const len = content.length;

  // Length scoring (optimal 50–600 chars)
  if (len >= 50 && len <= 600) score += 18;
  else if (len >= 20) score += 10;
  else if (len >= 5) score += 4;

  // Power words (up to 20 pts)
  const pw = POWER_WORDS.filter(w => lower.includes(w)).length;
  score += Math.min(pw * 5, 20);

  // Emotional triggers (up to 12 pts)
  const em = EMOTIONAL_WORDS.filter(w => lower.includes(w)).length;
  score += Math.min(em * 4, 12);

  // Question mark — engagement driver
  if (content.includes("?")) score += 8;

  // Numbers / specificity
  if (/\d+/.test(content)) score += 8;

  // CTA presence
  if (/follow|save|share|comment|link in bio|dm me|click/i.test(content)) score += 8;

  // Type-specific bonuses
  if (type === "hook" && /^(pov|wait|stop|the day|i never|nobody|she|he|they|this is)/i.test(content.trim())) score += 12;
  if (type === "hashtags" && content.includes("#")) score += 12;
  if (type === "caption" && len > 100) score += 8;
  if (type === "script" && len > 200) score += 8;
  if (type === "bio" && len < 160) score += 6;

  return Math.min(score, 100);
}

export function computeViralPotential(content: string, type: ContentType, niche: string): number {
  let score = computeAiScore(content, type);
  const ln = niche.toLowerCase();

  if (HIGH_VIRAL_NICHES.some(n => ln.includes(n))) score += 12;
  if (type === "hook")    score += 15;
  if (type === "thread")  score += 8;
  if (type === "idea")    score += 5;

  return Math.min(score, 100);
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Elite";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Good";
  if (score >= 20) return "Fair";
  return "Low";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-muted-foreground";
}

// ──────────────────────────────────────────────
//  Semantic search keyword extraction
//  (prepares entries for future vector embedding)
// ──────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "they",
  "your", "you", "are", "was", "what", "will", "not", "but", "when",
  "about", "their", "been", "more", "also", "into", "then", "than",
]);

export function extractSearchKeywords(
  entry: Pick<VaultEntry, "content" | "type" | "platform" | "niche" | "tone" | "tags" | "prompt">
): string[] {
  const words = new Set<string>();

  const addFrom = (text: string, max = 12) => {
    text.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOP_WORDS.has(w))
      .slice(0, max)
      .forEach(w => words.add(w));
  };

  addFrom(entry.content, 12);
  addFrom(entry.prompt, 5);

  words.add(entry.type);
  words.add(entry.platform.toLowerCase());
  words.add(entry.niche.toLowerCase());
  words.add(entry.tone.toLowerCase());
  entry.tags.forEach(t => words.add(t.toLowerCase()));

  return [...words].slice(0, 25);
}

// ──────────────────────────────────────────────
//  Factory
// ──────────────────────────────────────────────

function autoTitle(content: string, type: ContentType): string {
  const clean = content.replace(/\s+/g, " ").trim();
  const first = clean.split(/[.\n!?]/)[0] ?? clean;
  const truncated = first.length > 52 ? first.slice(0, 49) + "..." : first;
  return truncated || `${CONTENT_TYPE_LABELS[type]} — ${new Date().toLocaleDateString()}`;
}

export function createVaultEntry(
  overrides: Partial<VaultEntry> & {
    content: string;
    type: ContentType;
    niche: string;
    platform: VaultPlatform;
    tone: string;
    source: "generator" | "manual" | "import";
  }
): VaultEntry {
  const now = new Date().toISOString();
  const { content, type, niche, platform, tone, source } = overrides;

  const entry: VaultEntry = {
    id:               overrides.id              ?? crypto.randomUUID(),
    title:            overrides.title           ?? autoTitle(content, type),
    content,
    prompt:           overrides.prompt          ?? "",
    promptTemplate:   overrides.promptTemplate  ?? "",
    type,
    niche,
    platform,
    tone,
    source,
    model:            overrides.model           ?? "gpt-4o-mini",
    aiScore:          overrides.aiScore         ?? computeAiScore(content, type),
    viralPotential:   overrides.viralPotential  ?? computeViralPotential(content, type, niche),
    isFavourite:      overrides.isFavourite     ?? false,
    tags:             overrides.tags            ?? [],
    collectionId:     overrides.collectionId    ?? null,
    views:            overrides.views           ?? 0,
    searchKeywords:   [],
    embeddingReady:   false,
    campaignId:       overrides.campaignId      ?? null,
    deviceId:         overrides.deviceId        ?? getDeviceId(),
    createdAt:        overrides.createdAt       ?? now,
    updatedAt:        overrides.updatedAt       ?? now,
    lastAccessed:     overrides.lastAccessed    ?? now,
  };

  entry.searchKeywords = extractSearchKeywords(entry);
  entry.embeddingReady = entry.searchKeywords.length >= 5;

  return entry;
}

// ──────────────────────────────────────────────
//  localStorage CRUD
// ──────────────────────────────────────────────

const VAULT_KEY = "tlis_vault";
const EMPTY_STATE: VaultState = { entries: [], collections: [], recentlyViewed: [] };

export function loadVault(): VaultState {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return EMPTY_STATE;
    const p = JSON.parse(raw) as Partial<VaultState>;
    return {
      entries:        p.entries        ?? [],
      collections:    p.collections    ?? [],
      recentlyViewed: p.recentlyViewed ?? [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function saveVault(state: VaultState): void {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(state));
  } catch {
    // Storage quota error — silently ignore
  }
}

export function addVaultEntry(state: VaultState, entry: VaultEntry): VaultState {
  return { ...state, entries: [entry, ...state.entries] };
}

export function updateVaultEntry(state: VaultState, id: string, changes: Partial<VaultEntry>): VaultState {
  const now = new Date().toISOString();
  return {
    ...state,
    entries: state.entries.map(e =>
      e.id === id ? { ...e, ...changes, updatedAt: now } : e
    ),
  };
}

export function deleteVaultEntry(state: VaultState, id: string): VaultState {
  return {
    ...state,
    entries:        state.entries.filter(e => e.id !== id),
    recentlyViewed: state.recentlyViewed.filter(v => v !== id),
  };
}

export function toggleFavourite(state: VaultState, id: string): VaultState {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return state;
  return updateVaultEntry(state, id, { isFavourite: !entry.isFavourite });
}

export function recordView(state: VaultState, id: string): VaultState {
  const now = new Date().toISOString();
  const recent = [id, ...state.recentlyViewed.filter(v => v !== id)].slice(0, 10);
  return {
    ...state,
    recentlyViewed: recent,
    entries: state.entries.map(e =>
      e.id === id ? { ...e, views: (e.views ?? 0) + 1, lastAccessed: now } : e
    ),
  };
}

// ──────────────────────────────────────────────
//  Collection CRUD
// ──────────────────────────────────────────────

export function addCollection(
  state: VaultState,
  col: Omit<VaultCollection, "id" | "createdAt">
): VaultState {
  const newCol: VaultCollection = {
    ...col,
    id:        crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  return { ...state, collections: [...state.collections, newCol] };
}

export function updateCollection(state: VaultState, id: string, changes: Partial<VaultCollection>): VaultState {
  return {
    ...state,
    collections: state.collections.map(c => c.id === id ? { ...c, ...changes } : c),
  };
}

export function deleteCollection(state: VaultState, id: string): VaultState {
  return {
    ...state,
    collections: state.collections.filter(c => c.id !== id),
    entries: state.entries.map(e =>
      e.collectionId === id ? { ...e, collectionId: null } : e
    ),
  };
}

// ──────────────────────────────────────────────
//  Filter & sort
// ──────────────────────────────────────────────

export function filterAndSortEntries(
  entries: VaultEntry[],
  filters: VaultFilters,
  recentlyViewed: string[]
): VaultEntry[] {
  let result = [...entries];

  // Collection / special view filter
  if (filters.collectionId === "starred") {
    result = result.filter(e => e.isFavourite);
  } else if (filters.collectionId === "recent") {
    const set = new Set(recentlyViewed);
    result = result.filter(e => set.has(e.id));
  } else if (filters.collectionId !== "all") {
    result = result.filter(e => e.collectionId === filters.collectionId);
  }

  if (filters.type !== "all")      result = result.filter(e => e.type === filters.type);
  if (filters.platform !== "all")  result = result.filter(e => e.platform === filters.platform || e.platform === "All");
  if (filters.niche)               result = result.filter(e => e.niche.toLowerCase().includes(filters.niche.toLowerCase()));
  if (filters.tone)                result = result.filter(e => e.tone.toLowerCase().includes(filters.tone.toLowerCase()));

  // Semantic text search
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.niche.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      e.searchKeywords.some(k => k.includes(q)) ||
      e.prompt.toLowerCase().includes(q)
    );
  }

  switch (filters.sort) {
    case "newest":     result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    case "oldest":     result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
    case "score":      result.sort((a, b) => b.aiScore - a.aiScore); break;
    case "viral":      result.sort((a, b) => b.viralPotential - a.viralPotential); break;
    case "accessed":   result.sort((a, b) => b.lastAccessed.localeCompare(a.lastAccessed)); break;
    case "favourites": result.sort((a, b) => Number(b.isFavourite) - Number(a.isFavourite) || b.createdAt.localeCompare(a.createdAt)); break;
  }

  return result;
}

// ──────────────────────────────────────────────
//  Stats
// ──────────────────────────────────────────────

export function computeVaultStats(state: VaultState): VaultStats {
  const { entries, collections } = state;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const nicheCounts: Record<string, number>    = {};
  const platformCounts: Record<string, number> = {};
  let totalScore = 0;

  entries.forEach(e => {
    nicheCounts[e.niche]       = (nicheCounts[e.niche]       ?? 0) + 1;
    platformCounts[e.platform] = (platformCounts[e.platform] ?? 0) + 1;
    totalScore += e.aiScore;
  });

  return {
    totalEntries:      entries.length,
    totalFavourites:   entries.filter(e => e.isFavourite).length,
    totalCollections:  collections.length,
    avgScore:          entries.length > 0 ? Math.round(totalScore / entries.length) : 0,
    topNiche:          Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    topPlatform:       Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    recentCount:       entries.filter(e => e.createdAt >= sevenDaysAgo).length,
  };
}

// ──────────────────────────────────────────────
//  Derived lookups
// ──────────────────────────────────────────────

export function getAllNiches(entries: VaultEntry[]): string[] {
  return [...new Set(entries.map(e => e.niche).filter(Boolean))].sort();
}

export function getAllTones(entries: VaultEntry[]): string[] {
  return [...new Set(entries.map(e => e.tone).filter(Boolean))].sort();
}

export function getAllTags(entries: VaultEntry[]): string[] {
  return [...new Set(entries.flatMap(e => e.tags))].sort();
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}
