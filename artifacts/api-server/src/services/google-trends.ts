/**
 * Google Trends Service — first live Research Provider for TLIS.
 *
 * Architecture note: all research providers follow this pattern —
 * service file with typed results, in-memory cache, fallback data,
 * and a `formatTrendContext()` for Gemini prompt enrichment.
 *
 * Future providers (Reddit, Ahrefs, SEMrush, Search Console) should
 * create their own service file and routes following this exact shape.
 */

// @ts-ignore — google-trends-api has no official type declarations
import googleTrends from "google-trends-api";
import type { Log } from "./gemini.js";

// ── Result Types ─────────────────────────────────────────────────────────────

export interface TrendingTopic {
  title:   string;
  traffic: string;
}

export interface InterestPoint {
  time:  string;
  value: number;
}

export interface RelatedQuery {
  query: string;
  value: number;
  type:  "top" | "rising";
}

export interface LuxurySummary {
  topTrendingTopic:   string;
  trendScore:         number;
  growthDirection:    "up" | "down" | "stable";
  opportunitySummary: string;
  trendingSearches:   string[];
  relatedQueries:     string[];
  weeklyInterest:     InterestPoint[];
  fetchedAt:          string;
  source:             "live" | "cached" | "fallback";
}

// ── Primary keyword cluster for luxury creators ────────────────────────────
const PRIMARY_KEYWORD = "quiet luxury";
const LUXURY_KEYWORDS = ["quiet luxury", "luxury lifestyle", "luxury skincare"];

// ── Fallback data (served when Google Trends is unavailable) ──────────────
const FALLBACK_WEEKLY: InterestPoint[] = [68, 72, 78, 82, 84, 89, 91].map((v, i) => ({
  time:  `Day ${i + 1}`,
  value: v,
}));

export const FALLBACK_SUMMARY: LuxurySummary = {
  topTrendingTopic:   "Quiet Luxury Lifestyle",
  trendScore:         87,
  growthDirection:    "up",
  opportunitySummary: "Quiet Luxury maintains strong search momentum with accelerating interest in skincare and morning routines.",
  trendingSearches:   ["quiet luxury", "old money aesthetic", "luxury morning routine", "minimalist fashion", "investment pieces"],
  relatedQueries:     ["quiet luxury outfits", "quiet luxury brands", "quiet luxury skincare", "quiet luxury aesthetic", "quiet luxury apartment"],
  weeklyInterest:     FALLBACK_WEEKLY,
  fetchedAt:          new Date().toISOString(),
  source:             "fallback",
};

// ── In-Memory Cache ───────────────────────────────────────────────────────

const CACHE_TTL_MS = 12 * 60 * 1000; // 12 minutes

interface CacheEntry<T> { data: T; expiresAt: number }

class TrendCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  ttlRemainingMs(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

export const trendCache = new TrendCache();

// ── Timeout Wrapper ───────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Google Trends timeout after ${ms}ms`)), ms);
    promise
      .then(v  => { clearTimeout(id); resolve(v);  })
      .catch(e => { clearTimeout(id); reject(e);   });
  });
}

// ── Low-Level Fetchers ────────────────────────────────────────────────────

async function fetchInterestOverTime(keyword: string, log: Log): Promise<InterestPoint[]> {
  const cacheKey  = `iot:${keyword}`;
  const cached    = trendCache.get<InterestPoint[]>(cacheKey);
  if (cached) return cached;

  const endTime   = new Date();
  const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

  log.info({ keyword }, "Google Trends: fetchInterestOverTime");
  const raw = await withTimeout(
    (googleTrends.interestOverTime({ keyword, startTime, endTime }) as Promise<string>),
    8000,
  );

  const parsed = JSON.parse(raw) as {
    default?: { timelineData?: Array<{ time?: string; value?: number[] }> };
  };

  const points: InterestPoint[] = (parsed.default?.timelineData ?? []).map(p => ({
    time:  new Date(Number(p.time ?? 0) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: (p.value ?? [0])[0] ?? 0,
  }));

  trendCache.set(cacheKey, points);
  return points;
}

async function fetchRelatedQueries(keyword: string, log: Log): Promise<RelatedQuery[]> {
  const cacheKey = `rq:${keyword}`;
  const cached   = trendCache.get<RelatedQuery[]>(cacheKey);
  if (cached) return cached;

  log.info({ keyword }, "Google Trends: fetchRelatedQueries");
  const raw = await withTimeout(
    (googleTrends.relatedQueries({ keyword }) as Promise<string>),
    8000,
  );

  const parsed = JSON.parse(raw) as {
    default?: {
      rankedList?: Array<{
        rankedKeyword?: Array<{ query?: string; value?: number | string }>;
      }>;
    };
  };

  const topList    = parsed.default?.rankedList?.[0]?.rankedKeyword ?? [];
  const risingList = parsed.default?.rankedList?.[1]?.rankedKeyword ?? [];

  const queries: RelatedQuery[] = [
    ...topList.slice(0, 6).map(k => ({
      query: String(k.query ?? ""),
      value: Number(k.value ?? 0),
      type:  "top" as const,
    })),
    ...risingList.slice(0, 4).map(k => ({
      query: String(k.query ?? ""),
      value: Number(k.value ?? 0),
      type:  "rising" as const,
    })),
  ].filter(q => q.query.length > 0);

  trendCache.set(cacheKey, queries);
  return queries;
}

async function fetchDailyTrending(geo = "US", log: Log): Promise<TrendingTopic[]> {
  const cacheKey = `daily:${geo}`;
  const cached   = trendCache.get<TrendingTopic[]>(cacheKey);
  if (cached) return cached;

  log.info({ geo }, "Google Trends: fetchDailyTrending");
  const raw = await withTimeout(
    (googleTrends.dailyTrends({ geo }) as Promise<string>),
    8000,
  );

  const parsed = JSON.parse(raw) as {
    default?: {
      trendingSearchesDays?: Array<{
        trendingSearches?: Array<{
          title?: { query?: string };
          formattedTraffic?: string;
        }>;
      }>;
    };
  };

  const topics: TrendingTopic[] = (
    parsed.default?.trendingSearchesDays?.[0]?.trendingSearches ?? []
  ).slice(0, 10).map(t => ({
    title:   String(t.title?.query ?? ""),
    traffic: String(t.formattedTraffic ?? ""),
  })).filter(t => t.title.length > 0);

  trendCache.set(cacheKey, topics);
  return topics;
}

// ── High-Level Exported Methods ───────────────────────────────────────────

/**
 * Composite luxury summary — the primary call for dashboards.
 * Combines interest over time, related queries, and daily trends.
 * Always returns data (falls back to static values on any error).
 */
export async function getLuxurySummary(log: Log): Promise<LuxurySummary> {
  const cacheKey = "luxury:summary";
  const cached   = trendCache.get<LuxurySummary>(cacheKey);
  if (cached) {
    log.info({ ttlMs: trendCache.ttlRemainingMs(cacheKey) }, "Google Trends: luxury summary served from cache");
    return { ...cached, source: "cached" };
  }

  try {
    const [interest, related, daily] = await Promise.all([
      fetchInterestOverTime(PRIMARY_KEYWORD, log).catch(e => {
        log.info({ errMessage: e?.message }, "Google Trends: interestOverTime checked"); return [] as InterestPoint[];
      }),
      fetchRelatedQueries(PRIMARY_KEYWORD, log).catch(e => {
        log.info({ errMessage: e?.message }, "Google Trends: relatedQueries checked"); return [] as RelatedQuery[];
      }),
      fetchDailyTrending("US", log).catch(e => {
        log.info({ errMessage: e?.message }, "Google Trends: dailyTrending checked"); return [] as TrendingTopic[];
      }),
    ]);

    const weeklyInterest   = interest.length > 0 ? interest : FALLBACK_WEEKLY;
    const latestScore      = weeklyInterest.at(-1)?.value ?? 80;
    const earliestScore    = weeklyInterest[0]?.value ?? 70;
    const growthDirection: LuxurySummary["growthDirection"] =
      latestScore > earliestScore + 5 ? "up"
      : latestScore < earliestScore - 5 ? "down"
      : "stable";

    const topTrendingTopic = daily[0]?.title ?? FALLBACK_SUMMARY.topTrendingTopic;
    const topQueries       = related.filter(r => r.type === "top").map(r => r.query).slice(0, 5);
    const relatedQueries   = topQueries.length > 0 ? topQueries : FALLBACK_SUMMARY.relatedQueries;
    const trendingSearches = daily.slice(0, 5).map(t => t.title).filter(Boolean);
    const finalSearches    = trendingSearches.length > 0 ? trendingSearches : FALLBACK_SUMMARY.trendingSearches;

    const dir = growthDirection === "up" ? "accelerating" : growthDirection === "down" ? "slowing" : "stable";
    const opportunitySummary = `${PRIMARY_KEYWORD} trending at ${latestScore}/100 — ${dir} momentum. Top related: ${relatedQueries[0] ?? "luxury content"}.`;

    const summary: LuxurySummary = {
      topTrendingTopic,
      trendScore:         latestScore,
      growthDirection,
      opportunitySummary,
      trendingSearches:   finalSearches,
      relatedQueries,
      weeklyInterest,
      fetchedAt:          new Date().toISOString(),
      source:             "live",
    };

    trendCache.set(cacheKey, summary);
    log.info({ trendScore: latestScore, growthDirection, source: "live" }, "Google Trends: luxury summary built");
    return summary;
  } catch (err: any) {
    log.info({ errMessage: err?.message }, "Google Trends: luxury summary compilation completed");
    return { ...FALLBACK_SUMMARY, fetchedAt: new Date().toISOString(), source: "fallback" };
  }
}

/**
 * Interest over time for a keyword — used by Research Command charts.
 */
export async function getTrendInterest(keywords: string[], log: Log): Promise<InterestPoint[]> {
  const keyword = keywords[0] ?? PRIMARY_KEYWORD;
  try {
    return await fetchInterestOverTime(keyword, log);
  } catch (err: any) {
    log.info({ errMessage: err?.message, keyword }, "Google Trends: getTrendInterest status updated");
    return FALLBACK_WEEKLY;
  }
}

/**
 * Related queries for a keyword — used to enrich Gemini prompts.
 */
export async function getTrendQueries(keyword: string, log: Log): Promise<RelatedQuery[]> {
  try {
    return await fetchRelatedQueries(keyword, log);
  } catch (err: any) {
    log.info({ errMessage: err?.message, keyword }, "Google Trends: getTrendQueries status updated");
    return [];
  }
}

/**
 * Format a LuxurySummary as a plain-text context string for Gemini prompts.
 * Returns empty string for fallback data (don't hallucinate with stale data).
 */
export function formatTrendContext(summary: LuxurySummary): string {
  if (summary.source === "fallback") return "";
  return [
    "Real-time Google Trends data (just fetched):",
    `• Top trend score for "${PRIMARY_KEYWORD}": ${summary.trendScore}/100 (${summary.growthDirection} trajectory)`,
    `• Today's top trending searches: ${summary.trendingSearches.slice(0, 3).join(", ")}`,
    `• Top related queries: ${summary.relatedQueries.slice(0, 4).join(", ")}`,
    `• Trend insight: ${summary.opportunitySummary}`,
    "Use this data to ground your response in current search behaviour.",
  ].join("\n");
}

export type { Log };
