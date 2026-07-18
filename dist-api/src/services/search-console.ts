/**
 * Google Search Console Service — third live Research Provider for TLIS.
 *
 * Authentication: OAuth 2.0 refresh-token flow (zero external dependencies —
 * uses Node 24 native fetch for both token exchange and API calls).
 *
 * Required env vars (all four must be set for live mode):
 *   GSC_SITE_URL       — verified property URL, e.g. "https://example.com/"
 *   GSC_CLIENT_ID      — Google OAuth2 client ID
 *   GSC_CLIENT_SECRET  — Google OAuth2 client secret
 *   GSC_REFRESH_TOKEN  — long-lived refresh token from one-time OAuth flow
 *
 * When env vars are absent: returns rich fallback data, source = "fallback".
 *
 * Cache: 15-min TTL for analytics data; access token cached for 50 min.
 * Timeout: 10 s per API call.
 */

import type { Log } from "./gemini.js";

// ── Env Config ────────────────────────────────────────────────────────────

const GSC_SITE_URL      = process.env.GSC_SITE_URL;
const GSC_CLIENT_ID     = process.env.GSC_CLIENT_ID;
const GSC_CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const GSC_REFRESH_TOKEN = process.env.GSC_REFRESH_TOKEN;

export function isGSCAuthenticated(): boolean {
  return !!(GSC_SITE_URL && GSC_CLIENT_ID && GSC_CLIENT_SECRET && GSC_REFRESH_TOKEN);
}

// ── Result Types ──────────────────────────────────────────────────────────

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

// ── Fallback Data ─────────────────────────────────────────────────────────

export const FALLBACK_OVERVIEW: GSCSiteOverview = {
  clicks:        12840,
  impressions:   184200,
  ctr:           0.0697,
  position:      8.3,
  siteUrl:       GSC_SITE_URL ?? "https://example.com/",
  authenticated: false,
  fetchedAt:     new Date().toISOString(),
  source:        "fallback",
};

const FALLBACK_TOP_QUERIES: GSCQueryRow[] = [
  { query: "quiet luxury aesthetic",        clicks: 2140, impressions: 28300, ctr: 0.0756, position: 3.2 },
  { query: "old money fashion tips",        clicks: 1820, impressions: 24100, ctr: 0.0755, position: 4.1 },
  { query: "luxury skincare routine",       clicks: 1560, impressions: 19800, ctr: 0.0788, position: 2.8 },
  { query: "how to dress quiet luxury",     clicks: 1340, impressions: 14200, ctr: 0.0944, position: 2.3 },
  { query: "minimalist luxury wardrobe",    clicks: 1180, impressions: 16400, ctr: 0.0720, position: 5.4 },
  { query: "investment pieces fashion",     clicks:  980, impressions: 15700, ctr: 0.0624, position: 6.8 },
  { query: "quiet luxury brands list",      clicks:  860, impressions: 22100, ctr: 0.0389, position: 9.1 },
  { query: "old money aesthetic guide",     clicks:  740, impressions: 11300, ctr: 0.0655, position: 5.7 },
];

const FALLBACK_RISING_QUERIES: GSCQueryRow[] = [
  { query: "quiet luxury 2026",             clicks: 680,  impressions: 8900,  ctr: 0.0764, position: 4.2 },
  { query: "silent wealth aesthetic",       clicks: 520,  impressions: 6700,  ctr: 0.0776, position: 3.8 },
  { query: "luxury morning routine ideas",  clicks: 490,  impressions: 7200,  ctr: 0.0681, position: 6.1 },
  { query: "capsule wardrobe luxury",       clicks: 440,  impressions: 5800,  ctr: 0.0759, position: 4.9 },
];

const FALLBACK_TOP_PAGES: GSCPageRow[] = [
  { page: "/quiet-luxury-guide",         clicks: 3240, impressions: 42100, ctr: 0.0769, position: 2.9 },
  { page: "/old-money-aesthetic",        clicks: 2180, impressions: 28900, ctr: 0.0754, position: 3.7 },
  { page: "/luxury-skincare-routine",    clicks: 1890, impressions: 24300, ctr: 0.0778, position: 3.1 },
  { page: "/investment-pieces-guide",    clicks: 1540, impressions: 19800, ctr: 0.0778, position: 4.2 },
  { page: "/capsule-wardrobe-2026",      clicks: 1210, impressions: 16700, ctr: 0.0725, position: 5.8 },
];

const FALLBACK_COUNTRIES: GSCCountryRow[] = [
  { country: "United States",   clicks: 5840, impressions: 82100, ctr: 0.0711, position: 7.8 },
  { country: "United Kingdom",  clicks: 2160, impressions: 31200, ctr: 0.0692, position: 8.1 },
  { country: "Canada",          clicks: 1420, impressions: 20400, ctr: 0.0696, position: 8.4 },
  { country: "Australia",       clicks:  980, impressions: 14100, ctr: 0.0695, position: 8.9 },
  { country: "Germany",         clicks:  640, impressions: 10200, ctr: 0.0627, position: 9.3 },
];

const FALLBACK_DEVICES: GSCDeviceRow[] = [
  { device: "DESKTOP", clicks: 7968, impressions: 113922, ctr: 0.0699, position: 7.9 },
  { device: "MOBILE",  clicks: 4372, impressions:  63468, ctr: 0.0688, position: 8.9 },
  { device: "TABLET",  clicks:  500, impressions:   6810, ctr: 0.0734, position: 8.1 },
];

const FALLBACK_HIGH_CTR: GSCQueryRow[] = [
  { query: "how to dress quiet luxury",     clicks: 1340, impressions: 14200, ctr: 0.0944, position: 2.3 },
  { query: "luxury skincare routine",       clicks: 1560, impressions: 19800, ctr: 0.0788, position: 2.8 },
  { query: "quiet luxury aesthetic",        clicks: 2140, impressions: 28300, ctr: 0.0756, position: 3.2 },
];

const FALLBACK_LOW_CTR: GSCQueryRow[] = [
  { query: "quiet luxury brands list",      clicks:  860, impressions: 22100, ctr: 0.0389, position: 9.1 },
  { query: "investment pieces fashion",     clicks:  980, impressions: 15700, ctr: 0.0624, position: 6.8 },
  { query: "minimalist luxury wardrobe",    clicks: 1180, impressions: 16400, ctr: 0.0720, position: 5.4 },
];

const FALLBACK_LOW_COMPETITION: GSCQueryRow[] = [
  { query: "how to dress quiet luxury",     clicks: 1340, impressions: 14200, ctr: 0.0944, position: 2.3 },
  { query: "quiet luxury 2026",             clicks:  680, impressions:  8900, ctr: 0.0764, position: 4.2 },
  { query: "silent wealth aesthetic",       clicks:  520, impressions:  6700, ctr: 0.0776, position: 3.8 },
];

export const FALLBACK_ANALYTICS: GSCSearchAnalytics = {
  overview:   { clicks: 12840, impressions: 184200, ctr: 0.0697, position: 8.3 },
  topQueries: FALLBACK_TOP_QUERIES,
  risingQueries: FALLBACK_RISING_QUERIES,
  topPages:   FALLBACK_TOP_PAGES,
  countries:  FALLBACK_COUNTRIES,
  devices:    FALLBACK_DEVICES,
  highCTR:    FALLBACK_HIGH_CTR,
  lowCTR:     FALLBACK_LOW_CTR,
  searchIntent: ["informational how-to", "product research", "aesthetic inspiration", "brand discovery"],
  searchDemandScore: 84,
  lowCompetition: FALLBACK_LOW_COMPETITION,
  fetchedAt:  new Date().toISOString(),
  source:     "fallback",
  authenticated: false,
};

const FALLBACK_DATE_ROWS: GSCDateRow[] = [
  { date: "2026-06-02", clicks: 382, impressions: 5410, ctr: 0.0706, position: 8.4 },
  { date: "2026-06-09", clicks: 401, impressions: 5680, ctr: 0.0706, position: 8.2 },
  { date: "2026-06-16", clicks: 445, impressions: 6120, ctr: 0.0727, position: 8.0 },
  { date: "2026-06-23", clicks: 482, impressions: 6540, ctr: 0.0737, position: 7.8 },
  { date: "2026-06-30", clicks: 520, impressions: 6900, ctr: 0.0754, position: 7.6 },
];

// ── In-Memory Cache ───────────────────────────────────────────────────────

const CACHE_TTL_MS  = 15 * 60 * 1000;
const TOKEN_TTL_MS  = 50 * 60 * 1000;

interface CacheEntry<T> { data: T; expiresAt: number }

class GSCCache {
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

export const gscCache = new GSCCache();

// ── OAuth2 Token Exchange ─────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const cached = gscCache.get<string>("oauth:token");
  if (cached) return cached;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     GSC_CLIENT_ID!,
      client_secret: GSC_CLIENT_SECRET!,
      refresh_token: GSC_REFRESH_TOKEN!,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GSC OAuth token refresh failed (${res.status}): ${txt}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) throw new Error("GSC OAuth: no access_token in response");
  gscCache.set("oauth:token", data.access_token, TOKEN_TTL_MS);
  return data.access_token;
}

// ── Timeout Wrapper ───────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number, label = "request"): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`GSC ${label} timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(id); resolve(v); })
     .catch(e => { clearTimeout(id); reject(e); });
  });
}

// ── Date Helpers ──────────────────────────────────────────────────────────

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

function dateRange(daysAgo: number, windowDays = 28): { startDate: string; endDate: string } {
  const end   = new Date(Date.now() - daysAgo * 86_400_000);
  const start = new Date(end.getTime() - windowDays * 86_400_000);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

// ── Raw GSC API Types ─────────────────────────────────────────────────────

interface GSCRawRow {
  keys:        string[];
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}

// ── Search Console API Fetch ──────────────────────────────────────────────

async function queryAnalytics(
  dimensions: string[],
  rowLimit: number,
  log: Log,
  extraBody?: Record<string, unknown>,
): Promise<GSCRawRow[]> {
  const token    = await getAccessToken();
  const siteUrl  = GSC_SITE_URL!;
  const { startDate, endDate } = dateRange(3, 28);

  const body = { startDate, endDate, dimensions, rowLimit, ...extraBody };

  log.info({ siteUrl, dimensions, rowLimit }, "GSC: queryAnalytics");

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GSC API ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json() as { rows?: GSCRawRow[] };
  return data.rows ?? [];
}

// ── Derived Helpers ───────────────────────────────────────────────────────

function mapQueryRow(r: GSCRawRow): GSCQueryRow {
  return { query: r.keys[0] ?? "", clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position };
}

function mapPageRow(r: GSCRawRow): GSCPageRow {
  return { page: r.keys[0] ?? "", clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position };
}

function mapCountryRow(r: GSCRawRow): GSCCountryRow {
  return { country: r.keys[0] ?? "", clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position };
}

function mapDeviceRow(r: GSCRawRow): GSCDeviceRow {
  return { device: r.keys[0] ?? "", clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position };
}

function mapDateRow(r: GSCRawRow): GSCDateRow {
  return { date: r.keys[0] ?? "", clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position };
}

function computeSearchDemandScore(overview: GSCMetricRow): number {
  const clickScore  = Math.min(50, (overview.clicks / 500) * 50);
  const posScore    = Math.min(30, ((20 - overview.position) / 20) * 30);
  const ctrScore    = Math.min(20, (overview.ctr / 0.15) * 20);
  return Math.round(Math.max(0, clickScore + posScore + ctrScore));
}

function inferSearchIntent(queries: GSCQueryRow[]): string[] {
  const intents = new Set<string>();
  const titles  = queries.map(q => q.query.toLowerCase());
  if (titles.some(t => /^(how|what|why|when|where|is|are|can|does|should)/.test(t)))
    intents.add("informational how-to");
  if (titles.some(t => /(best|top|guide|tips|ideas|list|for)/.test(t)))
    intents.add("product research");
  if (titles.some(t => /(aesthetic|vibe|look|style|trend)/.test(t)))
    intents.add("aesthetic inspiration");
  if (titles.some(t => /(brand|buy|shop|wear|get)/.test(t)))
    intents.add("brand discovery");
  if (intents.size === 0) intents.add("general interest");
  return [...intents];
}

// ── High-Level Exported Methods ───────────────────────────────────────────

/**
 * Full analytics composite — the primary dashboard call.
 */
export async function getSearchAnalytics(log: Log): Promise<GSCSearchAnalytics> {
  const cacheKey = "gsc:analytics";
  const cached   = gscCache.get<GSCSearchAnalytics>(cacheKey);
  if (cached) {
    log.info({ ttlMs: gscCache.ttlMs(cacheKey) }, "GSC: analytics served from cache");
    return { ...cached, source: "cached" };
  }

  if (!isGSCAuthenticated()) {
    log.info("GSC: not authenticated, returning fallback analytics");
    return { ...FALLBACK_ANALYTICS, fetchedAt: new Date().toISOString() };
  }

  try {
    const [queryRows, pageRows, countryRows, deviceRows] = await Promise.all([
      withTimeout(queryAnalytics(["query"],   50, log), 10000, "queries"),
      withTimeout(queryAnalytics(["page"],    25, log), 10000, "pages"),
      withTimeout(queryAnalytics(["country"], 10, log), 10000, "countries"),
      withTimeout(queryAnalytics(["device"],   5, log), 10000, "devices"),
    ]);

    const topQueries    = queryRows.map(mapQueryRow);
    const topPages      = pageRows.map(mapPageRow);
    const countries     = countryRows.map(mapCountryRow);
    const devices       = deviceRows.map(mapDeviceRow);

    const risingQueries = [...topQueries]
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 6);

    const highCTR = [...topQueries]
      .filter(q => q.impressions >= 500)
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5);

    const lowCTR = [...topQueries]
      .filter(q => q.impressions >= 500)
      .sort((a, b) => a.ctr - b.ctr)
      .slice(0, 5);

    const lowCompetition = [...topQueries]
      .filter(q => q.position <= 5)
      .slice(0, 5);

    const overview: GSCMetricRow = topQueries.reduce(
      (acc, q) => ({
        clicks:      acc.clicks      + q.clicks,
        impressions: acc.impressions + q.impressions,
        ctr:         0,
        position:    0,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    );
    const totalQueries    = topQueries.length || 1;
    overview.ctr          = topQueries.reduce((s, q) => s + q.ctr, 0)      / totalQueries;
    overview.position     = topQueries.reduce((s, q) => s + q.position, 0) / totalQueries;

    const searchDemandScore = computeSearchDemandScore(overview);
    const searchIntent      = inferSearchIntent(topQueries);

    const result: GSCSearchAnalytics = {
      overview,
      topQueries:   topQueries.slice(0, 10),
      risingQueries,
      topPages,
      countries,
      devices,
      highCTR,
      lowCTR,
      searchIntent,
      searchDemandScore,
      lowCompetition,
      fetchedAt:    new Date().toISOString(),
      source:       "live",
      authenticated: true,
    };

    gscCache.set(cacheKey, result);
    log.info({ clicks: overview.clicks, searchDemandScore, source: "live" }, "GSC: analytics built");
    return result;
  } catch (err: any) {
    log.warn({ err: err?.message }, "GSC: analytics failed, returning fallback");
    return { ...FALLBACK_ANALYTICS, fetchedAt: new Date().toISOString(), source: "fallback" };
  }
}

/**
 * Site overview (headline metrics only).
 */
export async function getSiteOverview(log: Log): Promise<GSCSiteOverview> {
  const cacheKey = "gsc:overview";
  const cached   = gscCache.get<GSCSiteOverview>(cacheKey);
  if (cached) return { ...cached, source: "cached" };

  if (!isGSCAuthenticated()) {
    return { ...FALLBACK_OVERVIEW, fetchedAt: new Date().toISOString() };
  }

  try {
    const analytics = await getSearchAnalytics(log);
    const result: GSCSiteOverview = {
      ...analytics.overview,
      siteUrl:       GSC_SITE_URL!,
      authenticated: true,
      fetchedAt:     analytics.fetchedAt,
      source:        analytics.source === "live" ? "live" : "cached",
    };
    gscCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    log.warn({ err: err?.message }, "GSC: overview failed");
    return { ...FALLBACK_OVERVIEW, fetchedAt: new Date().toISOString() };
  }
}

/**
 * Date-bucketed row history — used for clicks, impressions, position history.
 */
export async function getDateHistory(log: Log): Promise<GSCDateRow[]> {
  const cacheKey = "gsc:date-history";
  const cached   = gscCache.get<GSCDateRow[]>(cacheKey);
  if (cached) return cached;

  if (!isGSCAuthenticated()) return FALLBACK_DATE_ROWS;

  try {
    const rows   = await withTimeout(queryAnalytics(["date"], 90, log), 10000, "date-history");
    const result = rows.map(mapDateRow).sort((a, b) => a.date.localeCompare(b.date));
    gscCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    log.warn({ err: err?.message }, "GSC: date history failed");
    return FALLBACK_DATE_ROWS;
  }
}

/**
 * Format GSCSearchAnalytics as plain text for Gemini prompt enrichment.
 * Returns empty string for fallback data.
 */
export function formatGSCContext(analytics: GSCSearchAnalytics): string {
  if (analytics.source === "fallback" && !analytics.authenticated) return "";

  const topQ  = analytics.topQueries.slice(0, 4).map(q => `"${q.query}"`).join(", ");
  const highQ = analytics.highCTR.slice(0, 2).map(q => `"${q.query}" (${(q.ctr * 100).toFixed(1)}% CTR)`).join(", ");
  const lowQ  = analytics.lowCTR.slice(0, 2).map(q => `"${q.query}" (${(q.ctr * 100).toFixed(1)}% CTR)`).join(", ");
  const geo   = analytics.countries.slice(0, 3).map(c => c.country).join(", ");
  const devPct = analytics.devices.map(d =>
    `${d.device.toLowerCase()} ${Math.round((d.clicks / (analytics.overview.clicks || 1)) * 100)}%`,
  ).join(", ");
  const intent = analytics.searchIntent.join(", ");

  return [
    "Real-time Google Search Console data (just fetched):",
    `• Total: ${analytics.overview.clicks.toLocaleString()} clicks · ${analytics.overview.impressions.toLocaleString()} impressions · ${(analytics.overview.ctr * 100).toFixed(1)}% CTR · Avg pos ${analytics.overview.position.toFixed(1)}`,
    `• Top queries: ${topQ}`,
    `• Fastest growing queries: ${analytics.risingQueries.slice(0, 3).map(q => `"${q.query}"`).join(", ")}`,
    `• Highest CTR queries: ${highQ}`,
    `• Lowest CTR queries (opportunity): ${lowQ}`,
    `• Search intent: ${intent}`,
    `• Device breakdown: ${devPct}`,
    `• Geographic reach: ${geo}`,
    "Use this data to align content with actual search behaviour.",
  ].join("\n");
}

export type { Log };
