import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { CalendarPost } from "./calendar";
import type { HistoryEntry } from "./usage";
import type { VaultEntry, VaultCollection, VaultState } from "./vault";

// ──────────────────────────────────────────────
//  Client initialisation
//  SUPABASE_URL and SUPABASE_ANON_KEY are exposed via vite.config envPrefix
// ──────────────────────────────────────────────
const supabaseUrl = (import.meta.env.SUPABASE_URL as string | undefined) ?? "";
const supabaseAnonKey = (import.meta.env.SUPABASE_ANON_KEY as string | undefined) ?? "";

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
      },
      global: { headers: { "x-app-name": "tlis" } },
    })
  : null;

export function isSupabaseReady(): boolean {
  return isConfigured;
}

// ──────────────────────────────────────────────
//  Auth user ID — reads from the cached session,
//  no network round-trip. Returns null for anon.
// ──────────────────────────────────────────────
export async function getAuthUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ──────────────────────────────────────────────
//  Device ID — pre-auth user identifier
//  UUID generated once, stored in localStorage
//  Upgrade path: replace with auth.uid() when Supabase Auth is added
// ──────────────────────────────────────────────
const DEVICE_ID_KEY = "tlis_device_id";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

// ──────────────────────────────────────────────
//  Connection health check
// ──────────────────────────────────────────────
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("calendar_posts")
      .select("id")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
//  Calendar posts — cloud operations
// ──────────────────────────────────────────────

export async function fetchCalendarFromCloud(): Promise<CalendarPost[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    let q = supabase.from("calendar_posts").select("*").order("created_at", { ascending: false });
    if (!userId) q = q.eq("device_id", getDeviceId());
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(rowToCalendarPost);
  } catch (err) {
    console.error("[TLIS] fetchCalendarFromCloud:", err);
    return [];
  }
}

export async function upsertPostToCloud(post: CalendarPost): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase
      .from("calendar_posts")
      .upsert(calendarPostToRow(post, userId), { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertPostToCloud:", err);
    return false;
  }
}

export async function upsertManyPostsToCloud(posts: CalendarPost[]): Promise<boolean> {
  if (!supabase || posts.length === 0) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase
      .from("calendar_posts")
      .upsert(posts.map(p => calendarPostToRow(p, userId)), { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertManyPostsToCloud:", err);
    return false;
  }
}

export async function deletePostFromCloud(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("calendar_posts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] deletePostFromCloud:", err);
    return false;
  }
}

/**
 * Full calendar sync: merges cloud data with local posts.
 * Cloud wins on ID conflicts (server as source of truth after first sync).
 * Local-only posts are pushed to cloud.
 * Returns the merged array for local state.
 */
export async function syncCalendarWithCloud(
  localPosts: CalendarPost[]
): Promise<{ posts: CalendarPost[]; synced: boolean }> {
  if (!supabase) return { posts: localPosts, synced: false };

  try {
    const cloudPosts = await fetchCalendarFromCloud();
    const cloudMap = new Map(cloudPosts.map(p => [p.id, p]));
    const localMap = new Map(localPosts.map(p => [p.id, p]));

    const merged: CalendarPost[] = [];
    const toUpsert: CalendarPost[] = [];

    // Cloud posts always included (cloud is truth)
    cloudPosts.forEach(p => merged.push(p));

    // Local-only posts get pushed to cloud
    localPosts.forEach(p => {
      if (!cloudMap.has(p.id)) {
        merged.push(p);
        toUpsert.push(p);
      }
    });

    if (toUpsert.length > 0) {
      await upsertManyPostsToCloud(toUpsert);
    }

    return { posts: merged, synced: true };
  } catch (err) {
    console.error("[TLIS] syncCalendarWithCloud:", err);
    return { posts: localPosts, synced: false };
  }
}

// Row <-> domain type conversions
function calendarPostToRow(post: CalendarPost, userId: string | null) {
  return {
    id: post.id,
    device_id: getDeviceId(),
    user_id: userId,
    title: post.title,
    content: post.content,
    type: post.type,
    platform: post.platform,
    niche: post.niche,
    status: post.status,
    scheduled_day: post.scheduledDay,
    scheduled_time: post.scheduledTime,
    note: post.note ?? null,
    created_at: post.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function rowToCalendarPost(row: Record<string, unknown>): CalendarPost {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    type: (row.type as CalendarPost["type"]) ?? "custom",
    platform: (row.platform as CalendarPost["platform"]) ?? "TikTok",
    niche: String(row.niche ?? ""),
    status: (row.status as CalendarPost["status"]) ?? "draft",
    scheduledDay: String(row.scheduled_day ?? ""),
    scheduledTime: row.scheduled_time ? String(row.scheduled_time) : null,
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

// ──────────────────────────────────────────────
//  AI Generations — cloud operations
// ──────────────────────────────────────────────

export async function insertGenerationToCloud(entry: HistoryEntry): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase.from("ai_generations").upsert(
      {
        id: entry.id,
        device_id: getDeviceId(),
        user_id: userId,
        type: entry.type,
        niche: entry.niche,
        tone: entry.tone,
        cost: entry.cost,
        created_at: entry.timestamp,
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] insertGenerationToCloud:", err);
    return false;
  }
}

export async function fetchGenerationsFromCloud(limit = 100): Promise<HistoryEntry[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    let qg = supabase.from("ai_generations").select("*").order("created_at", { ascending: false }).limit(limit);
    if (!userId) qg = qg.eq("device_id", getDeviceId());
    const { data, error } = await qg;
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: String(row.id),
      type: row.type as HistoryEntry["type"],
      niche: String(row.niche ?? ""),
      tone: String(row.tone ?? ""),
      cost: Number(row.cost ?? 0),
      timestamp: String(row.created_at),
    }));
  } catch (err) {
    console.error("[TLIS] fetchGenerationsFromCloud:", err);
    return [];
  }
}

/**
 * Sync generations: merges cloud history with local, deduped by ID.
 * Returns the merged array (up to 100 most recent).
 */
export async function syncGenerationsWithCloud(
  localHistory: HistoryEntry[]
): Promise<{ history: HistoryEntry[]; synced: boolean }> {
  if (!supabase) return { history: localHistory, synced: false };

  try {
    const cloudHistory = await fetchGenerationsFromCloud(200);
    const cloudMap = new Map(cloudHistory.map(e => [e.id, e]));
    const localMap = new Map(localHistory.map(e => [e.id, e]));
    const toUpsert: HistoryEntry[] = [];

    localHistory.forEach(e => {
      if (!cloudMap.has(e.id)) toUpsert.push(e);
    });

    if (toUpsert.length > 0) {
      await Promise.all(toUpsert.map(e => insertGenerationToCloud(e)));
    }

    const merged = [
      ...cloudHistory,
      ...localHistory.filter(e => !cloudMap.has(e.id)),
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 100);

    return { history: merged, synced: true };
  } catch (err) {
    console.error("[TLIS] syncGenerationsWithCloud:", err);
    return { history: localHistory, synced: false };
  }
}

// ──────────────────────────────────────────────
//  Saved outputs — cloud operations
// ──────────────────────────────────────────────

export interface SavedOutput {
  id: string;
  type: string;
  niche: string;
  platform: string;
  content: string;
  tone: string;
  isFavourite: boolean;
  source: string;
  createdAt: string;
}

export async function saveOutputToCloud(output: SavedOutput): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase.from("saved_outputs").upsert(
      {
        id: output.id,
        device_id: getDeviceId(),
        user_id: userId,
        type: output.type,
        niche: output.niche,
        platform: output.platform,
        content: output.content,
        tone: output.tone,
        is_favourite: output.isFavourite,
        source: output.source,
        created_at: output.createdAt,
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] saveOutputToCloud:", err);
    return false;
  }
}

export async function fetchSavedOutputsFromCloud(): Promise<SavedOutput[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    let qso = supabase.from("saved_outputs").select("*").order("created_at", { ascending: false });
    if (!userId) qso = qso.eq("device_id", getDeviceId());
    const { data, error } = await qso;
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: String(row.id),
      type: String(row.type ?? ""),
      niche: String(row.niche ?? ""),
      platform: String(row.platform ?? ""),
      content: String(row.content ?? ""),
      tone: String(row.tone ?? ""),
      isFavourite: Boolean(row.is_favourite),
      source: String(row.source ?? "generator"),
      createdAt: String(row.created_at),
    }));
  } catch (err) {
    console.error("[TLIS] fetchSavedOutputsFromCloud:", err);
    return [];
  }
}

// ──────────────────────────────────────────────
//  Intelligence Vault — cloud operations
//  Tables: vault_entries, vault_collections
// ──────────────────────────────────────────────

export async function upsertVaultEntryToCloud(entry: VaultEntry): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase.from("vault_entries").upsert(
      vaultEntryToRow(entry, userId),
      { onConflict: "id" }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertVaultEntryToCloud:", err);
    return false;
  }
}

export async function upsertManyVaultEntriesToCloud(entries: VaultEntry[]): Promise<boolean> {
  if (!supabase || entries.length === 0) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase.from("vault_entries").upsert(
      entries.map(e => vaultEntryToRow(e, userId)),
      { onConflict: "id" }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertManyVaultEntriesToCloud:", err);
    return false;
  }
}

export async function fetchVaultEntriesFromCloud(): Promise<VaultEntry[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    let qve = supabase.from("vault_entries").select("*").limit(500);
    if (!userId) qve = qve.eq("device_id", getDeviceId());
    const { data, error } = await qve;
    if (error) throw error;
    // Sort client-side by createdAt descending (avoids dependency on DB column ordering)
    const entries = (data ?? []).map(rowToVaultEntry);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error("[TLIS] fetchVaultEntriesFromCloud:", err);
    return [];
  }
}

export async function deleteVaultEntryFromCloud(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("vault_entries").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] deleteVaultEntryFromCloud:", err);
    return false;
  }
}

export async function upsertVaultCollectionToCloud(col: VaultCollection): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const { error } = await supabase.from("vault_collections").upsert(
      {
        id:          col.id,
        device_id:   getDeviceId(),
        user_id:     userId,
        name:        col.name,
        description: col.description,
        color:       col.color,
        icon:        col.icon,
        created_at:  col.createdAt,
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertVaultCollectionToCloud:", err);
    return false;
  }
}

export async function fetchVaultCollectionsFromCloud(): Promise<VaultCollection[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    let qvc = supabase.from("vault_collections").select("*").order("created_at", { ascending: true });
    if (!userId) qvc = qvc.eq("device_id", getDeviceId());
    const { data, error } = await qvc;
    if (error) throw error;
    return (data ?? []).map(row => ({
      id:          String(row.id),
      name:        String(row.name ?? ""),
      description: String(row.description ?? ""),
      color:       (row.color as VaultCollection["color"]) ?? "gold",
      icon:        String(row.icon ?? "folder"),
      createdAt:   String(row.created_at),
    }));
  } catch (err) {
    console.error("[TLIS] fetchVaultCollectionsFromCloud:", err);
    return [];
  }
}

export async function deleteVaultCollectionFromCloud(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("vault_collections").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] deleteVaultCollectionFromCloud:", err);
    return false;
  }
}

/**
 * Full vault sync — merges local state with cloud. Cloud wins on ID conflicts.
 * Local-only entries/collections are pushed up.
 */
export async function syncVaultWithCloud(
  local: VaultState
): Promise<{ state: VaultState; synced: boolean }> {
  if (!supabase) return { state: local, synced: false };

  try {
    const [cloudEntries, cloudCollections] = await Promise.all([
      fetchVaultEntriesFromCloud(),
      fetchVaultCollectionsFromCloud(),
    ]);

    // Entries — cloud wins on conflict
    const cloudEntryMap = new Map(cloudEntries.map(e => [e.id, e]));
    const localOnlyEntries = local.entries.filter(e => !cloudEntryMap.has(e.id));
    const mergedEntries: VaultEntry[] = [
      ...cloudEntries,
      ...localOnlyEntries,
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Collections — cloud wins on conflict
    const cloudColMap = new Map(cloudCollections.map(c => [c.id, c]));
    const localOnlyCols = local.collections.filter(c => !cloudColMap.has(c.id));
    const mergedCollections: VaultCollection[] = [...cloudCollections, ...localOnlyCols];

    // Push local-only items to cloud
    const pushPromises: Promise<unknown>[] = [];
    if (localOnlyEntries.length > 0)    pushPromises.push(upsertManyVaultEntriesToCloud(localOnlyEntries));
    if (localOnlyCols.length > 0)       pushPromises.push(Promise.all(localOnlyCols.map(upsertVaultCollectionToCloud)));
    await Promise.allSettled(pushPromises);

    return {
      state: { entries: mergedEntries, collections: mergedCollections, recentlyViewed: local.recentlyViewed },
      synced: true,
    };
  } catch (err) {
    console.error("[TLIS] syncVaultWithCloud:", err);
    return { state: local, synced: false };
  }
}

// Row <-> domain converters

function vaultEntryToRow(e: VaultEntry, userId: string | null) {
  return {
    id:               e.id,
    device_id:        getDeviceId(),
    user_id:          userId,
    title:            e.title,
    content:          e.content,
    prompt:           e.prompt,
    prompt_template:  e.promptTemplate,
    type:             e.type,
    niche:            e.niche,
    platform:         e.platform,
    tone:             e.tone,
    source:           e.source,
    model:            e.model,
    ai_score:         e.aiScore,
    viral_potential:  e.viralPotential,
    is_favourite:     e.isFavourite,
    tags:             e.tags,
    collection_id:    e.collectionId,
    views:            e.views,
    search_keywords:  e.searchKeywords,
    embedding_ready:  e.embeddingReady,
    campaign_id:      e.campaignId,
    created_at:       e.createdAt,
    updated_at:       e.updatedAt,
    last_accessed:    e.lastAccessed,
  };
}

function rowToVaultEntry(row: Record<string, unknown>): VaultEntry {
  return {
    id:              String(row.id),
    title:           String(row.title           ?? ""),
    content:         String(row.content         ?? ""),
    prompt:          String(row.prompt          ?? ""),
    promptTemplate:  String(row.prompt_template ?? ""),
    type:            (row.type as VaultEntry["type"])             ?? "other",
    niche:           String(row.niche           ?? ""),
    platform:        (row.platform as VaultEntry["platform"])     ?? "TikTok",
    tone:            String(row.tone            ?? ""),
    source:          (row.source as VaultEntry["source"])         ?? "generator",
    model:           String(row.model           ?? "gemini-2.5-flash"),
    aiScore:         Number(row.ai_score        ?? 0),
    viralPotential:  Number(row.viral_potential ?? 0),
    isFavourite:     Boolean(row.is_favourite),
    tags:            Array.isArray(row.tags)         ? (row.tags as string[])          : [],
    collectionId:    row.collection_id           ? String(row.collection_id)   : null,
    views:           Number(row.views            ?? 0),
    searchKeywords:  Array.isArray(row.search_keywords) ? (row.search_keywords as string[]) : [],
    embeddingReady:  Boolean(row.embedding_ready),
    campaignId:      row.campaign_id             ? String(row.campaign_id)     : null,
    deviceId:        String(row.device_id        ?? ""),
    createdAt:       String(row.created_at       ?? new Date().toISOString()),
    updatedAt:       String(row.updated_at       ?? new Date().toISOString()),
    lastAccessed:    String(row.last_accessed    ?? new Date().toISOString()),
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  User Profiles — subscription-ready
// ────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:                 string;
  email:              string | null;
  fullName:           string | null;
  avatarUrl:          string | null;
  plan:               "free" | "pro" | "enterprise";
  creditsUsed:        number;
  creditsLimit:       number;
  stripeCustomerId:   string | null;
  subscriptionStatus: string | null;
  createdAt:          string;
  updatedAt:          string;
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id:                 String(row["id"]),
    email:              row["email"] ? String(row["email"]) : null,
    fullName:           row["full_name"] ? String(row["full_name"]) : null,
    avatarUrl:          row["avatar_url"] ? String(row["avatar_url"]) : null,
    plan:               (row["plan"] as UserProfile["plan"]) ?? "free",
    creditsUsed:        Number(row["credits_used"]  ?? 0),
    creditsLimit:       Number(row["credits_limit"] ?? 100),
    stripeCustomerId:   row["stripe_customer_id"] ? String(row["stripe_customer_id"]) : null,
    subscriptionStatus: row["subscription_status"] ? String(row["subscription_status"]) : null,
    createdAt:          String(row["created_at"] ?? new Date().toISOString()),
    updatedAt:          String(row["updated_at"] ?? new Date().toISOString()),
  };
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return rowToProfile(data as Record<string, unknown>);
}

export async function createOrUpdateProfile(user: User): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from("profiles")
      .upsert(
        {
          id:         user.id,
          email:      user.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
  } catch {
    // Table may not exist yet — fail silently
  }
}

/**
 * Migrates all device-scoped rows to the authenticated user's account.
 * Gracefully skips tables that don't have a user_id column yet.
 */
export async function migrateDeviceDataToUser(userId: string): Promise<{
  success: boolean; migrated: number; error?: string;
}> {
  if (!supabase) return { success: false, migrated: 0, error: "Supabase not configured" };

  const deviceId = getDeviceId();
  const tables = [
    "calendar_posts",
    "vault_collections",
    "vault_entries",
    "ai_generations",
    "content_packs",
  ] as const;

  let totalMigrated = 0;
  let anySuccess    = false;

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("device_id", deviceId)
        .is("user_id", null)
        .select("id");
      if (!error) {
        anySuccess = true;
        totalMigrated += Array.isArray(data) ? data.length : 0;
      }
    } catch {
      // Table may not have user_id column yet — skip silently
    }
  }

  if (!anySuccess) {
    return {
      success: false,
      migrated: 0,
      error:
        "No tables could be migrated. Apply supabase-schema.sql in your Supabase SQL editor first, then try again.",
    };
  }

  return { success: true, migrated: totalMigrated };
}

// ────────────────────────────────────────────────────────────────────────────
//  Content Packs
// ────────────────────────────────────────────────────────────────────────────

export interface ContentPackRecord {
  id:              string;
  niche:           string;
  style:           string;
  tone:            string;
  platform:        string;
  audience:        string;
  hook:            string;
  caption:         string;
  videoPrompt:     string;
  hashtags:        string[];
  cta:             string;
  bestPostingTime: string;
  model:           string;
  isFavourite:     boolean;
  createdAt:       string;
  workspaceId?:    string;
  workflowStage:   string;
}

function contentPackToRow(p: ContentPackRecord, deviceId: string, userId: string | null): Record<string, unknown> {
  return {
    id:               p.id,
    device_id:        deviceId,
    user_id:          userId,
    niche:            p.niche,
    style:            p.style,
    tone:             p.tone,
    platform:         p.platform,
    audience:         p.audience,
    hook:             p.hook,
    caption:          p.caption,
    video_prompt:     p.videoPrompt,
    hashtags:         p.hashtags,
    cta:              p.cta,
    best_posting_time: p.bestPostingTime,
    model:            p.model,
    is_favourite:     p.isFavourite,
    workspace_id:     p.workspaceId ?? null,
    workflow_stage:   p.workflowStage ?? "generated",
    updated_at:       new Date().toISOString(),
  };
}

function rowToContentPack(row: Record<string, unknown>): ContentPackRecord {
  return {
    id:              String(row["id"]),
    niche:           String(row["niche"]            ?? ""),
    style:           String(row["style"]            ?? ""),
    tone:            String(row["tone"]             ?? ""),
    platform:        String(row["platform"]         ?? "TikTok"),
    audience:        String(row["audience"]         ?? ""),
    hook:            String(row["hook"]             ?? ""),
    caption:         String(row["caption"]          ?? ""),
    videoPrompt:     String(row["video_prompt"]     ?? ""),
    hashtags:        Array.isArray(row["hashtags"]) ? (row["hashtags"] as string[]) : [],
    cta:             String(row["cta"]              ?? ""),
    bestPostingTime: String(row["best_posting_time"] ?? ""),
    model:           String(row["model"]            ?? "gemini-2.5-flash"),
    isFavourite:     Boolean(row["is_favourite"]),
    createdAt:       String(row["created_at"]       ?? new Date().toISOString()),
    workspaceId:     row["workspace_id"] ? String(row["workspace_id"]) : undefined,
    workflowStage:   String(row["workflow_stage"]   ?? "generated"),
  };
}

export async function saveContentPackToCloud(pack: ContentPackRecord): Promise<boolean> {
  if (!supabase) return false;
  const deviceId = getDeviceId();
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("content_packs")
    .upsert(contentPackToRow(pack, deviceId, userId));
  if (error) console.error("[TLIS] saveContentPackToCloud:", error);
  return !error;
}

export async function fetchContentPacksFromCloud(): Promise<ContentPackRecord[]> {
  if (!supabase) return [];
  const userId = await getAuthUserId();
  let query = supabase
    .from("content_packs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (!userId) query = query.eq("device_id", getDeviceId());
  const { data, error } = await query;
  if (error) { console.error("[TLIS] fetchContentPacksFromCloud:", error); return []; }
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToContentPack);
}

export async function deleteContentPackFromCloud(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("content_packs").delete().eq("id", id);
  return !error;
}

export async function toggleContentPackFavourite(id: string, isFavourite: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("content_packs")
    .update({ is_favourite: isFavourite, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

// ──────────────────────────────────────────────
//  TikTok Workspaces — types & cloud operations
// ──────────────────────────────────────────────

export interface TikTokWorkspace {
  id:               string;
  userId:           string | null;
  createdAt:        string;
  updatedAt:        string;
  workspaceName:    string;
  accountName:      string;
  username:         string;
  platform:         string;
  niche:            string;
  audience:         string;
  goal:             string;
  postingFrequency: string;
  status:           "active" | "paused" | "archived";
  notes:            string;
}

export interface WorkspaceStats {
  workspaces:   number;
  contentPacks: number;
  vaultEntries: number;
  calendarPosts: number;
}

function workspaceToRow(w: TikTokWorkspace, userId: string | null): Record<string, unknown> {
  return {
    id:                w.id,
    user_id:           userId,
    workspace_name:    w.workspaceName,
    account_name:      w.accountName,
    username:          w.username,
    platform:          w.platform,
    niche:             w.niche,
    audience:          w.audience,
    goal:              w.goal,
    posting_frequency: w.postingFrequency,
    status:            w.status,
    notes:             w.notes,
    updated_at:        new Date().toISOString(),
  };
}

function rowToWorkspace(row: Record<string, unknown>): TikTokWorkspace {
  return {
    id:               String(row.id),
    userId:           row.user_id ? String(row.user_id) : null,
    createdAt:        String(row.created_at  ?? new Date().toISOString()),
    updatedAt:        String(row.updated_at  ?? new Date().toISOString()),
    workspaceName:    String(row.workspace_name    ?? ""),
    accountName:      String(row.account_name      ?? ""),
    username:         String(row.username           ?? ""),
    platform:         String(row.platform           ?? "TikTok"),
    niche:            String(row.niche              ?? ""),
    audience:         String(row.audience           ?? ""),
    goal:             String(row.goal               ?? ""),
    postingFrequency: String(row.posting_frequency  ?? ""),
    status:           (row.status as TikTokWorkspace["status"]) ?? "active",
    notes:            String(row.notes              ?? ""),
  };
}

export async function fetchWorkspacesFromCloud(): Promise<TikTokWorkspace[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("tiktok_workspaces")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToWorkspace);
  } catch (err) {
    console.error("[TLIS] fetchWorkspacesFromCloud:", err);
    return [];
  }
}

export async function upsertWorkspaceToCloud(workspace: TikTokWorkspace): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    if (!userId) return false;
    const { error } = await supabase
      .from("tiktok_workspaces")
      .upsert(workspaceToRow(workspace, userId), { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertWorkspaceToCloud:", err);
    return false;
  }
}

export async function deleteWorkspaceFromCloud(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("tiktok_workspaces")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] deleteWorkspaceFromCloud:", err);
    return false;
  }
}

export async function fetchWorkspaceStatsFromCloud(): Promise<WorkspaceStats> {
  const zero: WorkspaceStats = { workspaces: 0, contentPacks: 0, vaultEntries: 0, calendarPosts: 0 };
  if (!supabase) return zero;
  try {
    const userId = await getAuthUserId();
    const devId  = getDeviceId();
    const sb     = supabase;

    const cnt = async (table: string, isAuth: boolean): Promise<number> => {
      let q = sb.from(table).select("*", { count: "exact", head: true });
      if (!isAuth) q = q.eq("device_id", devId);
      const { count } = await q;
      return count ?? 0;
    };

    const [workspaces, contentPacks, vaultEntries, calendarPosts] = await Promise.all([
      userId ? cnt("tiktok_workspaces", true) : Promise.resolve(0),
      cnt("content_packs",  !!userId),
      cnt("vault_entries",  !!userId),
      cnt("calendar_posts", !!userId),
    ]);

    return { workspaces, contentPacks, vaultEntries, calendarPosts };
  } catch (err) {
    console.error("[TLIS] fetchWorkspaceStatsFromCloud:", err);
    return zero;
  }
}

// ── Workspace Workflow Engine — linking helpers ────────────────────────────

export async function upsertVaultEntryWithWorkspaceToCloud(
  entry: VaultEntry,
  workspaceId: string | null,
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const row = { ...vaultEntryToRow(entry, userId), workspace_id: workspaceId };
    const { error } = await supabase.from("vault_entries").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertVaultEntryWithWorkspaceToCloud:", err);
    return false;
  }
}

export async function upsertPostWithWorkspaceToCloud(
  post: CalendarPost,
  workspaceId: string | null,
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    const row = { ...calendarPostToRow(post, userId), workspace_id: workspaceId };
    const { error } = await supabase.from("calendar_posts").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertPostWithWorkspaceToCloud:", err);
    return false;
  }
}

export async function fetchWorkspaceLinkedCountsFromCloud(
  workspaceId: string,
): Promise<{ contentPacks: number; vaultEntries: number; calendarPosts: number }> {
  const zero = { contentPacks: 0, vaultEntries: 0, calendarPosts: 0 };
  if (!supabase) return zero;
  try {
    const sb = supabase;
    const [cpRes, veRes, calRes] = await Promise.all([
      sb.from("content_packs").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      sb.from("vault_entries").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      sb.from("calendar_posts").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    ]);
    return {
      contentPacks:  cpRes.count  ?? 0,
      vaultEntries:  veRes.count  ?? 0,
      calendarPosts: calRes.count ?? 0,
    };
  } catch (err) {
    console.error("[TLIS] fetchWorkspaceLinkedCountsFromCloud:", err);
    return zero;
  }
}

export async function updateWorkflowStageToCloud(
  id: string,
  stage: string,
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("content_packs")
      .update({ workflow_stage: stage, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] updateWorkflowStageToCloud:", err);
    return false;
  }
}

// ── TikTok Accounts — Module 14 ──────────────────────────────────────────────

export interface TikTokAccount {
  id:          string;
  userId:      string | null;
  workspaceId: string | null;
  accountName: string;
  username:    string;
  email:       string;
  phone:       string;
  country:     string;
  timezone:    string;
  language:    string;
  status:      "active" | "inactive" | "suspended" | "pending";
  notes:       string;
  hasPassword: boolean;
  createdAt:   string;
  updatedAt:   string;
}

function accountToRow(a: TikTokAccount, userId: string | null): Record<string, unknown> {
  return {
    id:           a.id,
    user_id:      userId,
    workspace_id: a.workspaceId ?? null,
    account_name: a.accountName,
    username:     a.username,
    email:        a.email,
    phone:        a.phone,
    country:      a.country,
    timezone:     a.timezone,
    language:     a.language,
    status:       a.status,
    notes:        a.notes,
    has_password: a.hasPassword,
    updated_at:   new Date().toISOString(),
  };
}

function rowToAccount(row: Record<string, unknown>): TikTokAccount {
  return {
    id:          String(row["id"]),
    userId:      row["user_id"]      ? String(row["user_id"])      : null,
    workspaceId: row["workspace_id"] ? String(row["workspace_id"]) : null,
    accountName: String(row["account_name"] ?? ""),
    username:    String(row["username"]      ?? ""),
    email:       String(row["email"]         ?? ""),
    phone:       String(row["phone"]         ?? ""),
    country:     String(row["country"]       ?? ""),
    timezone:    String(row["timezone"]      ?? ""),
    language:    String(row["language"]      ?? ""),
    status:      (row["status"] as TikTokAccount["status"]) ?? "active",
    notes:       String(row["notes"]         ?? ""),
    hasPassword: Boolean(row["has_password"]),
    createdAt:   String(row["created_at"]    ?? new Date().toISOString()),
    updatedAt:   String(row["updated_at"]    ?? new Date().toISOString()),
  };
}

export async function fetchAccountsFromCloud(): Promise<TikTokAccount[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("tiktok_accounts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToAccount);
  } catch (err) {
    console.error("[TLIS] fetchAccountsFromCloud:", err);
    return [];
  }
}

export async function upsertAccountToCloud(account: TikTokAccount): Promise<boolean> {
  if (!supabase) return false;
  try {
    const userId = await getAuthUserId();
    if (!userId) return false;
    const { error } = await supabase
      .from("tiktok_accounts")
      .upsert(accountToRow(account, userId), { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] upsertAccountToCloud:", err);
    return false;
  }
}

export async function deleteAccountFromCloud(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("tiktok_accounts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[TLIS] deleteAccountFromCloud:", err);
    return false;
  }
}

// ── Activity Feed ─────────────────────────────────────────────────────────

export type ActivityEventType =
  | "workspace" | "account" | "vault" | "calendar" | "content" | "ai";

export interface ActivityEvent {
  id:        string;
  action:    string;
  detail:    string;
  type:      ActivityEventType;
  createdAt: string;
}

/** Combine recent rows from 5 tables into a unified activity feed, newest first. */
export async function fetchRecentActivityFromCloud(limit = 10): Promise<ActivityEvent[]> {
  if (!supabase) return [];
  try {
    const userId = await getAuthUserId();
    if (!userId) return [];

    const LIMIT = 5;
    const uid = (q: ReturnType<typeof supabase.from>) =>
      (q as any).eq("user_id", userId);

    const [ws, acc, vault, cal, cp] = await Promise.allSettled([
      uid(supabase.from("tiktok_workspaces"))
        .select("id, workspace_name, username, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      uid(supabase.from("tiktok_accounts"))
        .select("id, account_name, username, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      uid(supabase.from("vault_entries"))
        .select("id, title, type, created_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      uid(supabase.from("calendar_posts"))
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      uid(supabase.from("content_packs"))
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
    ]);

    const events: ActivityEvent[] = [];

    if (ws.status === "fulfilled" && ws.value.data) {
      for (const r of ws.value.data as Record<string, unknown>[]) {
        const createdAt = String(r.created_at ?? "");
        const updatedAt = String(r.updated_at ?? "");
        const isNew = createdAt === updatedAt || !updatedAt;
        events.push({
          id:        `ws-${String(r.id)}`,
          action:    isNew ? "Workspace Created" : "Workspace Updated",
          detail:    `"${String(r.workspace_name ?? "Workspace")}" · @${String(r.username ?? "")}`,
          type:      "workspace",
          createdAt: updatedAt || createdAt,
        });
      }
    }

    if (acc.status === "fulfilled" && acc.value.data) {
      for (const r of acc.value.data as Record<string, unknown>[]) {
        const createdAt = String(r.created_at ?? "");
        const updatedAt = String(r.updated_at ?? "");
        const isNew = createdAt === updatedAt || !updatedAt;
        events.push({
          id:        `acc-${String(r.id)}`,
          action:    isNew ? "TikTok Account Added" : "TikTok Account Updated",
          detail:    `${String(r.account_name ?? "")} · @${String(r.username ?? "")}`,
          type:      "account",
          createdAt: updatedAt || createdAt,
        });
      }
    }

    if (vault.status === "fulfilled" && vault.value.data) {
      for (const r of vault.value.data as Record<string, unknown>[]) {
        events.push({
          id:        `vlt-${String(r.id)}`,
          action:    "Vault Entry Saved",
          detail:    String(r.title ?? `${String(r.type ?? "Entry")} saved to vault`),
          type:      "vault",
          createdAt: String(r.created_at ?? ""),
        });
      }
    }

    if (cal.status === "fulfilled" && cal.value.data) {
      for (const r of cal.value.data as Record<string, unknown>[]) {
        events.push({
          id:        `cal-${String(r.id)}`,
          action:    "Calendar Post Created",
          detail:    `"${String(r.title ?? "Post")}" · ${String(r.status ?? "draft")}`,
          type:      "calendar",
          createdAt: String(r.created_at ?? ""),
        });
      }
    }

    if (cp.status === "fulfilled" && cp.value.data) {
      for (const r of cp.value.data as Record<string, unknown>[]) {
        events.push({
          id:        `cp-${String(r.id)}`,
          action:    "Content Pack Generated",
          detail:    String(r.title ?? "Content pack created"),
          type:      "content",
          createdAt: String(r.created_at ?? ""),
        });
      }
    }

    // Sort newest-first and take top N
    return events
      .filter(e => e.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch (err) {
    console.error("[TLIS] fetchRecentActivityFromCloud:", err);
    return [];
  }
}
