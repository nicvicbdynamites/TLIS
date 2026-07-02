/**
 * Trends Provider — provider-agnostic client for TLIS pages.
 *
 * Matches the exact pattern of ai-provider.ts so future research providers
 * (Reddit, Ahrefs, SEMrush, Search Console) can swap in without page changes.
 *
 * Usage:
 *   import { trendsService } from "@/lib/trends-provider";
 *   const data = await trendsService.getLuxurySummary();
 *
 * React hook usage:
 *   import { useTrendSummary } from "@/lib/trends-provider";
 *   const { data, loading, error } = useTrendSummary();
 */

import { useEffect, useState } from "react";

// ── Result Types (mirror server types) ────────────────────────────────────

export interface InterestPoint {
  time:  string;
  value: number;
}

export interface RelatedQuery {
  query: string;
  value: number;
  type:  "top" | "rising";
}

export interface TrendingTopic {
  title:   string;
  traffic: string;
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

// ── HTTP Helper ────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res  = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({ error: "Failed to parse response" }));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ── Trends Service ─────────────────────────────────────────────────────────

export const trendsService = {
  /** Composite luxury summary — primary call for all dashboards. */
  getLuxurySummary: () =>
    get<LuxurySummary>("/trends/luxury-summary"),

  /** 7-day interest over time for given keywords. */
  getInterestOverTime: (keywords: string[]) =>
    get<{ keywords: string[]; data: InterestPoint[] }>("/trends/interest-over-time", {
      keywords: keywords.join(","),
    }),

  /** Related queries — top and rising searches. */
  getRelatedQueries: (keyword: string) =>
    get<{ keyword: string; data: RelatedQuery[] }>("/trends/related-queries", { keyword }),

  /** Today's daily trending searches for a geography. */
  getTrendingSearches: (geo = "US") =>
    get<{ geo: string; topics: TrendingTopic[] }>("/trends/trending-searches", { geo }),

  /** Related topics for a keyword. */
  getRelatedTopics: (keyword: string) =>
    get<{ keyword: string; topics: { title: string; type: string; value: number }[] }>(
      "/trends/related-topics",
      { keyword },
    ),
};

// ── React Hook ─────────────────────────────────────────────────────────────

export interface UseTrendSummaryResult {
  data:    LuxurySummary | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useTrendSummary(): UseTrendSummaryResult {
  const [data,    setData]    = useState<LuxurySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    trendsService.getLuxurySummary()
      .then(d  => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e?.message ?? "Failed to load trends")); setLoading(false); } });

    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
