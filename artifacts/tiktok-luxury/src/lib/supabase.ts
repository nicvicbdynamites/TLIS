import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CalendarPost } from "./calendar";
import type { HistoryEntry } from "./usage";

// ──────────────────────────────────────────────
//  Client initialisation
//  SUPABASE_URL and SUPABASE_ANON_KEY are exposed via vite.config envPrefix
// ──────────────────────────────────────────────
const supabaseUrl = (import.meta.env.SUPABASE_URL as string | undefined) ?? "";
const supabaseAnonKey = (import.meta.env.SUPABASE_ANON_KEY as string | undefined) ?? "";

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { "x-app-name": "tlis" } },
    })
  : null;

export function isSupabaseReady(): boolean {
  return isConfigured;
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
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from("calendar_posts")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });
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
    const { error } = await supabase
      .from("calendar_posts")
      .upsert(calendarPostToRow(post), { onConflict: "id" });
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
    const { error } = await supabase
      .from("calendar_posts")
      .upsert(posts.map(calendarPostToRow), { onConflict: "id" });
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
function calendarPostToRow(post: CalendarPost) {
  return {
    id: post.id,
    device_id: getDeviceId(),
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
    const { error } = await supabase.from("ai_generations").upsert(
      {
        id: entry.id,
        device_id: getDeviceId(),
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
    const { data, error } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("device_id", getDeviceId())
      .order("created_at", { ascending: false })
      .limit(limit);
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
    const { error } = await supabase.from("saved_outputs").upsert(
      {
        id: output.id,
        device_id: getDeviceId(),
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
    const { data, error } = await supabase
      .from("saved_outputs")
      .select("*")
      .eq("device_id", getDeviceId())
      .order("created_at", { ascending: false });
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
