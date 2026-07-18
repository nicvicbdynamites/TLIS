/**
 * Google Search Console routes — live SEO intelligence endpoints.
 *
 * All endpoints return 200 with data — never a naked 5xx.
 * When OAuth credentials are absent: fallback data is served transparently.
 *
 * GET /api/search-console/overview          — headline metrics (clicks, impressions, CTR, position)
 * GET /api/search-console/search-analytics  — full composite dashboard data
 * GET /api/search-console/top-queries       — top queries by clicks
 * GET /api/search-console/top-pages         — top pages by clicks
 * GET /api/search-console/countries         — geographic breakdown
 * GET /api/search-console/devices           — device breakdown
 * GET /api/search-console/ctr-report        — high/low CTR analysis
 * GET /api/search-console/impressions       — impressions over time (date-bucketed)
 * GET /api/search-console/clicks            — clicks over time (date-bucketed)
 * GET /api/search-console/position-history  — avg position over time (date-bucketed)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  getSiteOverview,
  getSearchAnalytics,
  getDateHistory,
  isGSCAuthenticated,
  FALLBACK_OVERVIEW,
  FALLBACK_ANALYTICS,
} from "../services/search-console.js";

const router: IRouter = Router();

// ── GET /api/search-console/overview ─────────────────────────────────────
router.get("/search-console/overview", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/overview request");
    const data = await getSiteOverview(req.log);
    res.json(data);
  } catch (err: any) {
    req.log.error({ err }, "search-console/overview unexpected error");
    res.json({ ...FALLBACK_OVERVIEW, fetchedAt: new Date().toISOString() });
  }
});

// ── GET /api/search-console/search-analytics ─────────────────────────────
router.get("/search-console/search-analytics", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/search-analytics request");
    const data = await getSearchAnalytics(req.log);
    res.json(data);
  } catch (err: any) {
    req.log.error({ err }, "search-console/search-analytics unexpected error");
    res.json({ ...FALLBACK_ANALYTICS, fetchedAt: new Date().toISOString() });
  }
});

// ── GET /api/search-console/top-queries ──────────────────────────────────
router.get("/search-console/top-queries", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/top-queries request");
    const analytics = await getSearchAnalytics(req.log);
    res.json({ queries: analytics.topQueries, source: analytics.source });
  } catch (err: any) {
    req.log.error({ err }, "search-console/top-queries unexpected error");
    res.json({ queries: FALLBACK_ANALYTICS.topQueries, source: "fallback" });
  }
});

// ── GET /api/search-console/top-pages ────────────────────────────────────
router.get("/search-console/top-pages", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/top-pages request");
    const analytics = await getSearchAnalytics(req.log);
    res.json({ pages: analytics.topPages, source: analytics.source });
  } catch (err: any) {
    req.log.error({ err }, "search-console/top-pages unexpected error");
    res.json({ pages: FALLBACK_ANALYTICS.topPages, source: "fallback" });
  }
});

// ── GET /api/search-console/countries ────────────────────────────────────
router.get("/search-console/countries", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/countries request");
    const analytics = await getSearchAnalytics(req.log);
    res.json({ countries: analytics.countries, source: analytics.source });
  } catch (err: any) {
    req.log.error({ err }, "search-console/countries unexpected error");
    res.json({ countries: FALLBACK_ANALYTICS.countries, source: "fallback" });
  }
});

// ── GET /api/search-console/devices ──────────────────────────────────────
router.get("/search-console/devices", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/devices request");
    const analytics = await getSearchAnalytics(req.log);
    res.json({ devices: analytics.devices, source: analytics.source });
  } catch (err: any) {
    req.log.error({ err }, "search-console/devices unexpected error");
    res.json({ devices: FALLBACK_ANALYTICS.devices, source: "fallback" });
  }
});

// ── GET /api/search-console/ctr-report ───────────────────────────────────
router.get("/search-console/ctr-report", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/ctr-report request");
    const analytics = await getSearchAnalytics(req.log);
    const avgCTR    = analytics.overview.ctr;
    res.json({ highCTR: analytics.highCTR, lowCTR: analytics.lowCTR, avgCTR, source: analytics.source });
  } catch (err: any) {
    req.log.error({ err }, "search-console/ctr-report unexpected error");
    res.json({
      highCTR: FALLBACK_ANALYTICS.highCTR,
      lowCTR:  FALLBACK_ANALYTICS.lowCTR,
      avgCTR:  FALLBACK_ANALYTICS.overview.ctr,
      source:  "fallback",
    });
  }
});

// ── GET /api/search-console/impressions ──────────────────────────────────
router.get("/search-console/impressions", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/impressions request");
    const rows = await getDateHistory(req.log);
    res.json({ rows: rows.map(r => ({ date: r.date, value: r.impressions })) });
  } catch (err: any) {
    req.log.error({ err }, "search-console/impressions unexpected error");
    res.json({ rows: [], source: "fallback" });
  }
});

// ── GET /api/search-console/clicks ───────────────────────────────────────
router.get("/search-console/clicks", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/clicks request");
    const rows = await getDateHistory(req.log);
    res.json({ rows: rows.map(r => ({ date: r.date, value: r.clicks })) });
  } catch (err: any) {
    req.log.error({ err }, "search-console/clicks unexpected error");
    res.json({ rows: [], source: "fallback" });
  }
});

// ── GET /api/search-console/position-history ─────────────────────────────
router.get("/search-console/position-history", async (req: Request, res: Response) => {
  try {
    req.log.info("search-console/position-history request");
    const rows = await getDateHistory(req.log);
    res.json({ rows: rows.map(r => ({ date: r.date, value: r.position })) });
  } catch (err: any) {
    req.log.error({ err }, "search-console/position-history unexpected error");
    res.json({ rows: [], source: "fallback" });
  }
});

// ── GET /api/search-console/status ───────────────────────────────────────
router.get("/search-console/status", (_req: Request, res: Response) => {
  res.json({
    authenticated: isGSCAuthenticated(),
    requiredEnvVars: ["GSC_SITE_URL", "GSC_CLIENT_ID", "GSC_CLIENT_SECRET", "GSC_REFRESH_TOKEN"],
    configured: {
      GSC_SITE_URL:      !!process.env.GSC_SITE_URL,
      GSC_CLIENT_ID:     !!process.env.GSC_CLIENT_ID,
      GSC_CLIENT_SECRET: !!process.env.GSC_CLIENT_SECRET,
      GSC_REFRESH_TOKEN: !!process.env.GSC_REFRESH_TOKEN,
    },
  });
});

export default router;
