/**
 * Search Console Provider — frontend client for TLIS pages.
 *
 * Matches the pattern of trends-provider.ts and reddit-provider.ts exactly.
 *
 * Usage:
 *   import { searchConsoleService } from "@/lib/search-console-provider";
 *   const data = await searchConsoleService.getAnalytics();
 *
 * React hook:
 *   import { useSearchConsoleAnalytics } from "@/lib/search-console-provider";
 *   const { data, loading, error } = useSearchConsoleAnalytics();
 */

import { useEffect, useState } from "react";

// ── Result Types (mirror server types) ────────────────────────────────────

export interface GSCMetricRow {
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}

export interface GSCQueryRow extends GSCMetricRow {
  query: string;
}

export interface GSCPageRow extends GSCMetricRow {
  page: string;
}

export interface GSCCountryRow extends GSCMetricRow {
  country: string;
}

export interface GSCDeviceRow extends GSCMetricRow {
  device: string;
}

export interface GSCDateRow extends GSCMetricRow {
  date: string;
}

export interface GSCSiteOverview extends GSCMetricRow {
  siteUrl:       string;
  authenticated: boolean;
  fetchedAt:     string;
  source:        "live" | "cached" | "fallback";
}

export interface GSCSearchAnalytics {
  overview:          GSCMetricRow;
  topQueries:        GSCQueryRow[];
  risingQueries:     GSCQueryRow[];
  topPages:          GSCPageRow[];
  countries:         GSCCountryRow[];
  devices:           GSCDeviceRow[];
  highCTR:           GSCQueryRow[];
  lowCTR:            GSCQueryRow[];
  searchIntent:      string[];
  searchDemandScore: number;
  lowCompetition:    GSCQueryRow[];
  fetchedAt:         string;
  source:            "live" | "cached" | "fallback";
  authenticated:     boolean;
}

// ── HTTP Helper ────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res  = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({ error: "Failed to parse response" }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

// ── Search Console Service ─────────────────────────────────────────────────

export const searchConsoleService = {
  getOverview:        () => get<GSCSiteOverview>("/search-console/overview"),
  getAnalytics:       () => get<GSCSearchAnalytics>("/search-console/search-analytics"),
  getTopQueries:      () => get<{ queries: GSCQueryRow[] }>("/search-console/top-queries"),
  getTopPages:        () => get<{ pages: GSCPageRow[] }>("/search-console/top-pages"),
  getCountries:       () => get<{ countries: GSCCountryRow[] }>("/search-console/countries"),
  getDevices:         () => get<{ devices: GSCDeviceRow[] }>("/search-console/devices"),
  getCTRReport:       () => get<{ highCTR: GSCQueryRow[]; lowCTR: GSCQueryRow[]; avgCTR: number }>("/search-console/ctr-report"),
  getImpressions:     () => get<{ rows: GSCDateRow[] }>("/search-console/impressions"),
  getClicks:          () => get<{ rows: GSCDateRow[] }>("/search-console/clicks"),
  getPositionHistory: () => get<{ rows: GSCDateRow[] }>("/search-console/position-history"),
};

// ── React Hooks ────────────────────────────────────────────────────────────

export interface UseGSCResult<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

function useGSCQuery<T>(fetcher: () => Promise<T>): UseGSCResult<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then(d  => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e?.message ?? "Failed")); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}

export function useSearchConsoleAnalytics(): UseGSCResult<GSCSearchAnalytics> {
  return useGSCQuery(() => searchConsoleService.getAnalytics());
}

export function useSearchConsoleOverview(): UseGSCResult<GSCSiteOverview> {
  return useGSCQuery(() => searchConsoleService.getOverview());
}
