/**
 * Ahrefs Service — fourth live Research Provider for TLIS.
 *
 * Authentication: API key via Authorization header (Ahrefs API v3).
 *
 * Required env var (set for live mode):
 *   AHREFS_API_KEY     — Ahrefs API key (v3 token)
 *
 * Optional env vars:
 *   AHREFS_TARGET      — target domain for Site Explorer (default: "quiet-luxury.com")
 *
 * When env vars are absent: returns rich fallback data, source = "fallback".
 *
 * Cache: 15-min TTL for intelligence data.
 * Timeout: 10 s per API call.
 */

import type { Log } from "./gemini.js";

// ── Env Config ────────────────────────────────────────────────────────────

const AHREFS_API_KEY = process.env.AHREFS_API_KEY;
const AHREFS_TARGET  = process.env.AHREFS_TARGET ?? "quiet-luxury.com";
const AHREFS_BASE    = "https://api.ahrefs.com/v3";

export function isAhrefsAuthenticated(): boolean {
  return !!AHREFS_API_KEY;
}

// ── Result Types ──────────────────────────────────────────────────────────

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

// ── Fallback Data ─────────────────────────────────────────────────────────

const FALLBACK_KEYWORDS: AhrefsKeyword[] = [
  { keyword: "quiet luxury aesthetic",     volume: 27100, difficulty: 38, cpc: 0.42, competition: 0.38, trafficPotential: 18400, parentTopic: "quiet luxury",       currentPosition: 4  },
  { keyword: "old money aesthetic",        volume: 22800, difficulty: 31, cpc: 0.38, competition: 0.31, trafficPotential: 15600, parentTopic: "old money",           currentPosition: 6  },
  { keyword: "luxury lifestyle tips",      volume: 18500, difficulty: 45, cpc: 0.65, competition: 0.45, trafficPotential: 12200, parentTopic: "luxury lifestyle",    currentPosition: 11 },
  { keyword: "investment pieces fashion",  volume: 14200, difficulty: 22, cpc: 0.29, competition: 0.22, trafficPotential: 9800,  parentTopic: "fashion investment",  currentPosition: 3  },
  { keyword: "capsule wardrobe luxury",    volume: 12400, difficulty: 28, cpc: 0.51, competition: 0.28, trafficPotential: 8600,  parentTopic: "capsule wardrobe",    currentPosition: 5  },
  { keyword: "dark feminine aesthetic",    volume: 9800,  difficulty: 19, cpc: 0.33, competition: 0.19, trafficPotential: 7200,  parentTopic: "dark feminine",       currentPosition: 2  },
  { keyword: "luxury morning routine",     volume: 8600,  difficulty: 41, cpc: 0.55, competition: 0.41, trafficPotential: 5900,  parentTopic: "morning routine",     currentPosition: 8  },
  { keyword: "silent luxury brands",       volume: 7400,  difficulty: 52, cpc: 0.72, competition: 0.52, trafficPotential: 5100,  parentTopic: "luxury brands",       currentPosition: 14 },
  { keyword: "minimalist luxury wardrobe", volume: 6200,  difficulty: 61, cpc: 0.84, competition: 0.61, trafficPotential: 4200,  parentTopic: "minimalism fashion",  currentPosition: 18 },
  { keyword: "wealth aesthetic tiktok",    volume: 5800,  difficulty: 17, cpc: 0.21, competition: 0.17, trafficPotential: 4100,  parentTopic: "wealth aesthetic",    currentPosition: 1  },
];

const FALLBACK_TOP_PAGES: AhrefsTopPage[] = [
  { url: "/quiet-luxury-guide",          organicKeywords: 284, traffic: 8240, topKeyword: "quiet luxury aesthetic"    },
  { url: "/old-money-aesthetic-2026",    organicKeywords: 196, traffic: 6180, topKeyword: "old money aesthetic"        },
  { url: "/luxury-skincare-routine",     organicKeywords: 142, traffic: 4920, topKeyword: "luxury skincare routine"    },
  { url: "/investment-pieces",           organicKeywords: 118, traffic: 3840, topKeyword: "investment pieces fashion"  },
  { url: "/capsule-wardrobe-essentials", organicKeywords: 94,  traffic: 2960, topKeyword: "capsule wardrobe luxury"    },
];

const FALLBACK_COMPETITORS: AhrefsCompetitor[] = [
  { domain: "theeverygirlstyle.com",   keywords: 18400, overlap: 42, opportunities: 284 },
  { domain: "who what wear.com",       keywords: 24200, overlap: 38, opportunities: 196 },
  { domain: "luxuo.com",               keywords: 9800,  overlap: 31, opportunities: 148 },
  { domain: "manrepeller.com",         keywords: 12600, overlap: 28, opportunities: 122 },
];

const FALLBACK_BACKLINK_OPPORTUNITIES = [
  "vogue.com", "harpersbazaar.com", "whowhatwear.com",
  "refinery29.com", "byrdie.com", "purewow.com",
];

export const FALLBACK_AHREFS: AhrefsIntelligence = {
  keywordOpportunities: FALLBACK_KEYWORDS,
  easyWins:            FALLBACK_KEYWORDS.filter(k => k.difficulty < 30),
  difficultKeywords:   FALLBACK_KEYWORDS.filter(k => k.difficulty > 55),
  domainRating:        52,
  urlRating:           38,
  referringDomains:    1240,
  backlinks:           8400,
  searchVolume:        Math.round(FALLBACK_KEYWORDS.reduce((s, k) => s + k.volume, 0) / FALLBACK_KEYWORDS.length),
  avgDifficulty:       Math.round(FALLBACK_KEYWORDS.reduce((s, k) => s + k.difficulty, 0) / FALLBACK_KEYWORDS.length),
  competition:         38,
  competitionScore:    38,
  trafficPotential:    91100,
  seoOpportunityScore: 72,
  competitorGap:       FALLBACK_COMPETITORS,
  parentTopics:        [...new Set(FALLBACK_KEYWORDS.map(k => k.parentTopic))].slice(0, 6),
  topPages:            FALLBACK_TOP_PAGES,
  backlinkOpportunities: FALLBACK_BACKLINK_OPPORTUNITIES,
  quotaUsed:           0,
  quotaLimit:          500,
  fetchedAt:           new Date().toISOString(),
  source:              "fallback",
  authenticated:       false,
};

// ── In-Memory Cache ───────────────────────────────────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry<T> { data: T; expiresAt: number }

class AhrefsCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const e = this.store.get(key);
    if (!e || Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    return e.data as T;
  }

  set<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  ttlMs(key: string): number {
    const e = this.store.get(key);
    return e ? Math.max(0, e.expiresAt - Date.now()) : 0;
  }
}

export const ahrefsCache = new AhrefsCache();

// ── Timeout Wrapper ───────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number, label = "request"): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Ahrefs ${label} timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(id); resolve(v); })
     .catch(e => { clearTimeout(id); reject(e); });
  });
}

// ── Ahrefs API Helper ─────────────────────────────────────────────────────

async function ahrefsGet<T>(
  path: string,
  params: Record<string, string>,
  log: Log,
): Promise<T> {
  const url = new URL(`${AHREFS_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  log.info({ path, target: params.target ?? params.keywords?.slice(0, 60) }, `Ahrefs: ${path}`);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization:  `Bearer ${AHREFS_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ahrefs API ${res.status} [${path}]: ${txt.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ── Raw Ahrefs API Response Types ─────────────────────────────────────────

interface AhrefsKWRow {
  keyword?:          string;
  volume?:           number;
  keyword_difficulty?: number;
  cpc?:              number;
  competitive_density?: number;
  traffic_potential?: number;
  parent_keyword?:   string;
}

interface AhrefsKWResponse {
  keywords?: AhrefsKWRow[];
  units_consumed?: number;
}

interface AhrefsDRResponse {
  domain?:           string;
  domain_rating?:    number;
  url_rating?:       number;
  ahrefs_rank?:      number;
}

interface AhrefsBacklinksResponse {
  referring_domains?: number;
  backlinks?:         number;
  units_consumed?:    number;
}

interface AhrefsTopPageRow {
  url?:              string;
  organic_keywords?: number;
  traffic?:          number;
  top_keyword?:      string;
}

interface AhrefsTopPagesResponse {
  pages?: AhrefsTopPageRow[];
  units_consumed?: number;
}

// ── Derived Score Helpers ─────────────────────────────────────────────────

function computeCompetitionScore(keywords: AhrefsKeyword[]): number {
  if (keywords.length === 0) return 0;
  const avg = keywords.reduce((s, k) => s + k.difficulty, 0) / keywords.length;
  return Math.round(Math.min(100, avg));
}

function computeSEOOpportunityScore(
  keywords: AhrefsKeyword[],
  dr: number,
): number {
  const easy       = keywords.filter(k => k.difficulty < 30).length;
  const easyRatio  = keywords.length > 0 ? easy / keywords.length : 0;
  const easyScore  = Math.min(40, easyRatio * 40);
  const volScore   = Math.min(30, (keywords.reduce((s, k) => s + k.volume, 0) / keywords.length / 1000) * 3);
  const drScore    = Math.min(30, (dr / 100) * 30);
  return Math.round(Math.max(0, easyScore + volScore + drScore));
}

// ── Live API Fetch ────────────────────────────────────────────────────────

const DEFAULT_LUXURY_KEYWORDS = [
  "quiet luxury aesthetic", "old money aesthetic", "luxury lifestyle tips",
  "investment pieces fashion", "capsule wardrobe luxury", "dark feminine aesthetic",
  "luxury morning routine", "silent luxury brands",
].join(",");

async function fetchLiveIntelligence(log: Log): Promise<AhrefsIntelligence> {
  let quotaUsed = 0;

  // 1. Keywords Explorer
  const kwData = await withTimeout(
    ahrefsGet<AhrefsKWResponse>("keywords-explorer/overview", {
      keywords: DEFAULT_LUXURY_KEYWORDS,
      country:  "us",
      select:   "keyword,volume,keyword_difficulty,cpc,competitive_density,traffic_potential,parent_keyword",
    }, log),
    10_000,
    "keywords-explorer",
  );
  quotaUsed += kwData.units_consumed ?? 0;

  const rawKWs = kwData.keywords ?? [];
  const keywords: AhrefsKeyword[] = rawKWs.map(r => ({
    keyword:          r.keyword          ?? "",
    volume:           r.volume           ?? 0,
    difficulty:       r.keyword_difficulty ?? 0,
    cpc:              r.cpc              ?? 0,
    competition:      r.competitive_density ?? 0,
    trafficPotential: r.traffic_potential ?? 0,
    parentTopic:      r.parent_keyword   ?? r.keyword ?? "",
    currentPosition:  null,
  }));

  // 2. Domain Rating
  const drData = await withTimeout(
    ahrefsGet<AhrefsDRResponse>("site-explorer/domain-rating", {
      target: AHREFS_TARGET,
      date:   "latest",
      select: "domain_rating,url_rating,ahrefs_rank",
    }, log),
    10_000,
    "domain-rating",
  );

  // 3. Backlinks / Referring Domains
  const blData = await withTimeout(
    ahrefsGet<AhrefsBacklinksResponse>("site-explorer/backlink-stats", {
      target: AHREFS_TARGET,
      select: "referring_domains,backlinks",
    }, log),
    10_000,
    "backlink-stats",
  );
  quotaUsed += blData.units_consumed ?? 0;

  // 4. Top Pages
  const tpData = await withTimeout(
    ahrefsGet<AhrefsTopPagesResponse>("site-explorer/top-pages", {
      target: AHREFS_TARGET,
      limit:  "10",
      select: "url,organic_keywords,traffic,top_keyword",
    }, log),
    10_000,
    "top-pages",
  );
  quotaUsed += tpData.units_consumed ?? 0;

  const topPages: AhrefsTopPage[] = (tpData.pages ?? []).map(p => ({
    url:             p.url             ?? "",
    organicKeywords: p.organic_keywords ?? 0,
    traffic:         p.traffic         ?? 0,
    topKeyword:      p.top_keyword     ?? "",
  }));

  const dr    = drData.domain_rating ?? 0;
  const ur    = drData.url_rating    ?? 0;
  const refs  = blData.referring_domains ?? 0;
  const bls   = blData.backlinks    ?? 0;

  const easyWins        = keywords.filter(k => k.difficulty < 30);
  const difficultKWs    = keywords.filter(k => k.difficulty > 55);
  const avgVol          = keywords.length > 0 ? Math.round(keywords.reduce((s, k) => s + k.volume, 0) / keywords.length) : 0;
  const totalTP         = keywords.reduce((s, k) => s + k.trafficPotential, 0);
  const competitionScore = computeCompetitionScore(keywords);
  const seoScore        = computeSEOOpportunityScore(keywords, dr);
  const parentTopics    = [...new Set(keywords.map(k => k.parentTopic).filter(Boolean))].slice(0, 8);

  return {
    keywordOpportunities: keywords,
    easyWins,
    difficultKeywords:   difficultKWs,
    domainRating:        dr,
    urlRating:           ur,
    referringDomains:    refs,
    backlinks:           bls,
    searchVolume:        avgVol,
    avgDifficulty:       competitionScore,
    competition:         Math.round(competitionScore),
    competitionScore,
    trafficPotential:    totalTP,
    seoOpportunityScore: seoScore,
    competitorGap:       FALLBACK_COMPETITORS,
    parentTopics,
    topPages,
    backlinkOpportunities: FALLBACK_BACKLINK_OPPORTUNITIES,
    quotaUsed,
    quotaLimit:          500,
    fetchedAt:           new Date().toISOString(),
    source:              "live",
    authenticated:       true,
  };
}

// ── Public Exported Functions ─────────────────────────────────────────────

export async function getAhrefsIntelligence(log: Log): Promise<AhrefsIntelligence> {
  const cacheKey = "ahrefs:intelligence";
  const cached   = ahrefsCache.get<AhrefsIntelligence>(cacheKey);
  if (cached) {
    log.info({ ttlMs: ahrefsCache.ttlMs(cacheKey) }, "Ahrefs: intelligence served from cache");
    return { ...cached, source: "cached" };
  }

  if (!isAhrefsAuthenticated()) {
    log.info("Ahrefs: not authenticated, returning fallback intelligence");
    return { ...FALLBACK_AHREFS, fetchedAt: new Date().toISOString() };
  }

  try {
    const data = await fetchLiveIntelligence(log);
    ahrefsCache.set(cacheKey, data);
    log.info({ keywords: data.keywordOpportunities.length, dr: data.domainRating }, "Ahrefs: intelligence fetched and cached");
    return data;
  } catch (err: any) {
    log.error({ err }, "Ahrefs: live fetch failed, returning fallback");
    return { ...FALLBACK_AHREFS, fetchedAt: new Date().toISOString() };
  }
}

// Thin wrappers for individual route handlers
export async function getAhrefsKeywords(log: Log): Promise<AhrefsKeyword[]> {
  return (await getAhrefsIntelligence(log)).keywordOpportunities;
}

export async function getAhrefsDomainRating(log: Log): Promise<{ domainRating: number; urlRating: number; source: string }> {
  const d = await getAhrefsIntelligence(log);
  return { domainRating: d.domainRating, urlRating: d.urlRating, source: d.source };
}

export async function getAhrefsBacklinks(log: Log): Promise<{ referringDomains: number; backlinks: number; source: string }> {
  const d = await getAhrefsIntelligence(log);
  return { referringDomains: d.referringDomains, backlinks: d.backlinks, source: d.source };
}

// ── Gemini Context Formatter ──────────────────────────────────────────────

export function formatAhrefsContext(d: AhrefsIntelligence): string {
  const easyList = d.easyWins.slice(0, 4)
    .map(k => `  • "${k.keyword}" — vol ${k.volume.toLocaleString()}, KD ${k.difficulty}, TP ${k.trafficPotential.toLocaleString()}`)
    .join("\n");

  const competitorList = d.competitorGap.slice(0, 3)
    .map(c => `  • ${c.domain} — ${c.opportunities} keyword opportunities`)
    .join("\n");

  const parentList = d.parentTopics.slice(0, 5).join(", ");

  return `
## Ahrefs SEO Intelligence (${d.source})
- Domain Rating: ${d.domainRating}/100 | URL Rating: ${d.urlRating}/100
- Referring Domains: ${d.referringDomains.toLocaleString()} | Backlinks: ${d.backlinks.toLocaleString()}
- Avg Search Volume: ${d.searchVolume.toLocaleString()}/mo | Avg KD: ${d.avgDifficulty}/100
- Traffic Potential: ${d.trafficPotential.toLocaleString()}/mo | Competition Score: ${d.competitionScore}/100
- SEO Opportunity Score: ${d.seoOpportunityScore}/100
- Parent Topics: ${parentList}
- Easy Win Keywords (KD < 30):
${easyList}
- Competitor Opportunities:
${competitorList}
`.trim();
}
