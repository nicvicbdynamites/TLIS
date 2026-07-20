import type { Log } from "./gemini.js";

// ——— Result Types ———

export interface TrendItem {
  title: string;
  formattedValue: string;
  link: string;
  pubDate: string;
  source?: string;
}

export interface GoogleTrendsSummary {
  trendingTopics: string[];
  recentTrends: TrendItem[];
  fetchedAt: string;
  source: "live" | "cached" | "fallback";
}

// ——— Fallback Data ———

const FALLBACK_TRENDS: TrendItem[] = [
  { title: "quiet luxury fashion", formattedValue: "+850%", link: "https://trends.google.com", pubDate: new Date().toDateString(), source: "Google Trends Fallback" },
  { title: "minimalist capsule wardrobe", formattedValue: "+400%", link: "https://trends.google.com", pubDate: new Date().toDateString(), source: "Google Trends Fallback" },
  { title: "sustainable luxury brands", formattedValue: "+250%", link: "https://trends.google.com", pubDate: new Date().toDateString(), source: "Google Trends Fallback" },
  { title: "old money aesthetic clothing", formattedValue: "+600%", link: "https://trends.google.com", pubDate: new Date().toDateString(), source: "Google Trends Fallback" }
];

export const FALLBACK_SUMMARY: GoogleTrendsSummary = {
  trendingTopics: ["quiet luxury", "capsule wardrobe", "old money aesthetic", "timeless style"],
  recentTrends: FALLBACK_TRENDS,
  fetchedAt: new Date().toISOString(),
  source: "fallback",
};

// ——— In-Memory Cache ———

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CacheEntry<T> { data: T; expiresAt: number }

class TrendsCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }
}

export const trendsCache = new TrendsCache();

// ——— High-Level Exported Methods matching trends.ts ———

export async function getLuxurySummary(log: Log): Promise<GoogleTrendsSummary> {
  const cacheKey = "trends:luxury:summary";
  const cached = trendsCache.get<GoogleTrendsSummary>(cacheKey);
  
  if (cached) return { ...cached, source: "cached" };

  try {
    const url = "https://trends.google.com/trending/rss?geo=US";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const xmlText = await res.text();
    const items: TrendItem[] = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const content = match[1];
      const title = content.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      if (title) {
        items.push({
          title: title.toLowerCase(),
          formattedValue: "+100%",
          link: "https://trends.google.com",
          pubDate: new Date().toDateString(),
          source: "Google Trends Live"
        });
      }
    }

    if (items.length === 0) throw new Error("Empty items");

    const summary: GoogleTrendsSummary = {
      trendingTopics: items.slice(0, 5).map(i => i.title),
      recentTrends: items.slice(0, 10),
      fetchedAt: new Date().toISOString(),
      source: "live"
    };

    trendsCache.set(cacheKey, summary);
    return summary;
  } catch (err: any) {
    log.warn({ err: err.message }, "Google Trends fallback used.");
    return { ...FALLBACK_SUMMARY, fetchedAt: new Date().toISOString(), source: "fallback" };
  }
}

// Stub function to prevent interest route crashes
export async function getTrendInterest(keywords: string[], log: Log): Promise<any> {
  log.info({ keywords }, "Fetching trend interest");
  return { timelineData: [] };
}

// Stub function to prevent query route crashes
export async function getTrendQueries(keyword: string, log: Log): Promise<any> {
  log.info({ keyword }, "Fetching related trend queries");
  return { default: { rankedList: [] } };
}

export function formatTrendsContext(summary: GoogleTrendsSummary): string {
  if (summary.source === "fallback") return "";
  return `Trending terms: ${summary.trendingTopics.slice(0, 4).join(", ")}`;
}

export type { Log };
