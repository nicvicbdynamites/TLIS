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

export const FALLBACK_TRENDS_SUMMARY: GoogleTrendsSummary = {
  trendingTopics: ["quiet luxury", "capsule wardrobe", "old money aesthetic", "timeless style"],
  recentTrends: FALLBACK_TRENDS,
  fetchedAt: new Date().toISOString(),
  source: "fallback",
};

// ——— In-Memory Cache ———

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 Hours

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

  ttlRemainingMs(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

export const trendsCache = new TrendsCache();

// ——— High-Level Exported Methods ———

export async function getGoogleTrendsSummary(log: Log): Promise<GoogleTrendsSummary> {
  const cacheKey = "trends:luxury:summary";
  const cached = trendsCache.get<GoogleTrendsSummary>(cacheKey);
  
  if (cached) {
    log.info({ ttlMs: trendsCache.ttlRemainingMs(cacheKey) }, "Google Trends: cache hit");
    return { ...cached, source: "cached" };
  }

  log.info({}, "Google Trends: fetch request initiated");

  try {
    // RSS Feed URL for US Daily Trending Searches
    const url = "https://trends.google.com/trending/rss?geo=US";
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/xml, text/xml, */*"
      },
      signal: AbortSignal.timeout(6000) // 6 second safety timeout
    });

    if (!res.ok) {
      throw new Error(`Google Trends API returned status: ${res.status}`);
    }

    const xmlText = await res.text();
    
    // Quick RegExp extraction to parse the basic RSS values without heavy XML library overhead
    const items: TrendItem[] = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const content = match[1];
      const title = content.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const approxTraffic = content.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] ?? "+100%";
      const link = content.match(/<link>(.*?)<\/link>/)?.[1] ?? "https://trends.google.com";
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";

      if (title) {
        items.push({
          title: title.toLowerCase(),
          formattedValue: approxTraffic,
          link,
          pubDate,
          source: "Google Trends Live"
        });
      }
    }

    // Filter relevant terms or default to top trending items if empty
    const trendingTopics = items.slice(0, 5).map(i => i.title);

    if (items.length === 0) {
      throw new Error("No trend items could be parsed from the feed.");
    }

    const summary: GoogleTrendsSummary = {
      trendingTopics: trendingTopics.length > 0 ? trendingTopics : FALLBACK_TRENDS_SUMMARY.trendingTopics,
      recentTrends: items.slice(0, 10),
      fetchedAt: new Date().toISOString(),
      source: "live"
    };

    trendsCache.set(cacheKey, summary);
    log.info({ topicsCount: summary.trendingTopics.length }, "Google Trends: summary successfully compiled");
    return summary;

  } catch (err: any) {
    // ⚠️ THIS CATCH BLOCK SAVES YOUR APP FROM CRASHING WHEN BLOCKED
    log.warn({ err: err.message }, "Google Trends block/timeout detected. Gracefully serving fallback data.");
    return {
      ...FALLBACK_TRENDS_SUMMARY,
      fetchedAt: new Date().toISOString(),
      source: "fallback"
    };
  }
}

export function formatTrendsContext(summary: GoogleTrendsSummary): string {
  if (summary.source === "fallback") return "";
  const topics = summary.trendingTopics.slice(0, 4).join(", ");
  return [
    "Current Google Trends macro data:",
    `• High-velocity trending search topics: ${topics}`,
    "Incorporate structural momentum from these themes if contextually relevant."
  ].join("\n");
}

export type { Log };
