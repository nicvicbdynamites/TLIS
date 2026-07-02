/**
 * Ahrefs Provider — frontend client for TLIS pages.
 *
 * Matches the pattern of search-console-provider.ts exactly.
 *
 * Usage:
 *   import { ahrefsService } from "@/lib/ahrefs-provider";
 *   const data = await ahrefsService.getIntelligence();
 *
 * React hook:
 *   import { useAhrefsIntelligence } from "@/lib/ahrefs-provider";
 *   const { data, loading, error } = useAhrefsIntelligence();
 */

import { useEffect, useState } from "react";

// ── Result Types (mirror server types) ────────────────────────────────────

export interface AhrefsKeyword {
  keyword:          string;
  volume:           number;
  difficulty:       number;
  cpc:              number;
  competition:      number;
  trafficPotential: number;
  parentTopic:      string;
  currentPosition:  number | null;
}

export interface AhrefsTopPage {
  url:             string;
  organicKeywords: number;
  traffic:         number;
  topKeyword:      string;
}

export interface AhrefsCompetitor {
  domain:        string;
  keywords:      number;
  overlap:       number;
  opportunities: number;
}

export interface AhrefsIntelligence {
  keywordOpportunities: AhrefsKeyword[];
  easyWins:            AhrefsKeyword[];
  difficultKeywords:   AhrefsKeyword[];
  domainRating:        number;
  urlRating:           number;
  referringDomains:    number;
  backlinks:           number;
  searchVolume:        number;
  avgDifficulty:       number;
  competition:         number;
  competitionScore:    number;
  trafficPotential:    number;
  seoOpportunityScore: number;
  competitorGap:       AhrefsCompetitor[];
  parentTopics:        string[];
  topPages:            AhrefsTopPage[];
  backlinkOpportunities: string[];
  quotaUsed:           number;
  quotaLimit:          number;
  fetchedAt:           string;
  source:              "live" | "cached" | "fallback";
  authenticated:       boolean;
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

// ── Ahrefs Service ─────────────────────────────────────────────────────────

export const ahrefsService = {
  getIntelligence:      () => get<AhrefsIntelligence>("/ahrefs/intelligence"),
  getKeywords:          (q?: string) => get<{ keywords: AhrefsKeyword[]; source: string }>("/ahrefs/keywords", q ? { q } : undefined),
  getDifficulty:        (keyword: string) => get<{ keyword: string; difficulty: number; source: string }>("/ahrefs/difficulty", { keyword }),
  getVolume:            (keyword: string) => get<{ keyword: string; volume: number; source: string }>("/ahrefs/volume", { keyword }),
  getParentTopic:       (keyword: string) => get<{ keyword: string; parentTopic: string; source: string }>("/ahrefs/parent-topic", { keyword }),
  getSerp:              (keyword: string) => get<{ keyword: string; results: AhrefsKeyword[]; source: string }>("/ahrefs/serp", { keyword }),
  getTopPages:          () => get<{ pages: AhrefsTopPage[]; source: string }>("/ahrefs/top-pages"),
  getTrafficPotential:  (keyword: string) => get<{ keyword: string; trafficPotential: number; source: string }>("/ahrefs/traffic-potential", { keyword }),
  getReferringDomains:  () => get<{ referringDomains: number; source: string }>("/ahrefs/referring-domains"),
  getBacklinks:         () => get<{ backlinks: number; referringDomains: number; source: string }>("/ahrefs/backlinks"),
  getCompetitorGap:     () => get<{ competitors: AhrefsCompetitor[]; source: string }>("/ahrefs/competitor-gap"),
  getContentGap:        () => get<{ keywords: AhrefsKeyword[]; source: string }>("/ahrefs/content-gap"),
  getDomainRating:      () => get<{ domainRating: number; urlRating: number; source: string }>("/ahrefs/domain-rating"),
  getUrlRating:         (url: string) => get<{ url: string; urlRating: number; source: string }>("/ahrefs/url-rating", { url }),
};

// ── React Hooks ────────────────────────────────────────────────────────────

export interface UseAhrefsResult<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

function useAhrefsQuery<T>(fetcher: () => Promise<T>): UseAhrefsResult<T> {
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

export function useAhrefsIntelligence(): UseAhrefsResult<AhrefsIntelligence> {
  return useAhrefsQuery(() => ahrefsService.getIntelligence());
}
