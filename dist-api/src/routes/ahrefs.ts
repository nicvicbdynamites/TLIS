/**
 * Ahrefs routes — SEO intelligence endpoints.
 *
 * All endpoints return 200 with data — never a naked 5xx.
 * When API key is absent: fallback data is served transparently.
 *
 * GET /api/ahrefs/intelligence       — full composite dashboard data (primary endpoint)
 * GET /api/ahrefs/keywords           — keyword explorer
 * GET /api/ahrefs/difficulty         — keyword difficulty for ?keyword=
 * GET /api/ahrefs/volume             — search volume for ?keyword=
 * GET /api/ahrefs/parent-topic       — parent topic for ?keyword=
 * GET /api/ahrefs/serp               — SERP overview for ?keyword=
 * GET /api/ahrefs/top-pages          — top ranking pages
 * GET /api/ahrefs/traffic-potential  — traffic potential for ?keyword=
 * GET /api/ahrefs/referring-domains  — referring domains
 * GET /api/ahrefs/backlinks          — backlinks summary
 * GET /api/ahrefs/competitor-gap     — competitor gap analysis
 * GET /api/ahrefs/content-gap        — content gap keywords
 * GET /api/ahrefs/domain-rating      — domain rating
 * GET /api/ahrefs/url-rating         — URL rating for ?url=
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  getAhrefsIntelligence,
  getAhrefsKeywords,
  getAhrefsDomainRating,
  getAhrefsBacklinks,
  FALLBACK_AHREFS,
  isAhrefsAuthenticated,
} from "../services/ahrefs.js";

const router: IRouter = Router();

// ── GET /api/ahrefs/intelligence ──────────────────────────────────────────
router.get("/ahrefs/intelligence", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/intelligence request");
    const data = await getAhrefsIntelligence(req.log);
    res.json(data);
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/intelligence unexpected error");
    res.json({ ...FALLBACK_AHREFS, fetchedAt: new Date().toISOString() });
  }
});

// ── GET /api/ahrefs/keywords ──────────────────────────────────────────────
router.get("/ahrefs/keywords", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/keywords request");
    const keywords = await getAhrefsKeywords(req.log);
    const intel    = await getAhrefsIntelligence(req.log);
    res.json({ keywords, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/keywords unexpected error");
    res.json({ keywords: FALLBACK_AHREFS.keywordOpportunities, source: "fallback" });
  }
});

// ── GET /api/ahrefs/difficulty ────────────────────────────────────────────
router.get("/ahrefs/difficulty", async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword ?? "");
  try {
    req.log.info({ keyword }, "ahrefs/difficulty request");
    const intel = await getAhrefsIntelligence(req.log);
    const match = intel.keywordOpportunities.find(k => k.keyword.toLowerCase() === keyword.toLowerCase());
    const difficulty = match?.difficulty ?? intel.avgDifficulty;
    res.json({ keyword: keyword || "overall", difficulty, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/difficulty unexpected error");
    res.json({ keyword, difficulty: FALLBACK_AHREFS.avgDifficulty, source: "fallback" });
  }
});

// ── GET /api/ahrefs/volume ────────────────────────────────────────────────
router.get("/ahrefs/volume", async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword ?? "");
  try {
    req.log.info({ keyword }, "ahrefs/volume request");
    const intel = await getAhrefsIntelligence(req.log);
    const match = intel.keywordOpportunities.find(k => k.keyword.toLowerCase() === keyword.toLowerCase());
    const volume = match?.volume ?? intel.searchVolume;
    res.json({ keyword: keyword || "overall", volume, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/volume unexpected error");
    res.json({ keyword, volume: FALLBACK_AHREFS.searchVolume, source: "fallback" });
  }
});

// ── GET /api/ahrefs/parent-topic ──────────────────────────────────────────
router.get("/ahrefs/parent-topic", async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword ?? "");
  try {
    req.log.info({ keyword }, "ahrefs/parent-topic request");
    const intel = await getAhrefsIntelligence(req.log);
    const match = intel.keywordOpportunities.find(k => k.keyword.toLowerCase() === keyword.toLowerCase());
    const parentTopic = match?.parentTopic ?? intel.parentTopics[0] ?? "luxury lifestyle";
    res.json({ keyword: keyword || "overall", parentTopic, allTopics: intel.parentTopics, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/parent-topic unexpected error");
    res.json({ keyword, parentTopic: FALLBACK_AHREFS.parentTopics[0], allTopics: FALLBACK_AHREFS.parentTopics, source: "fallback" });
  }
});

// ── GET /api/ahrefs/serp ──────────────────────────────────────────────────
router.get("/ahrefs/serp", async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword ?? "");
  try {
    req.log.info({ keyword }, "ahrefs/serp request");
    const intel = await getAhrefsIntelligence(req.log);
    const results = keyword
      ? intel.keywordOpportunities.filter(k => k.keyword.toLowerCase().includes(keyword.toLowerCase())).slice(0, 10)
      : intel.keywordOpportunities.slice(0, 10);
    res.json({ keyword, results, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/serp unexpected error");
    res.json({ keyword, results: FALLBACK_AHREFS.keywordOpportunities.slice(0, 10), source: "fallback" });
  }
});

// ── GET /api/ahrefs/top-pages ─────────────────────────────────────────────
router.get("/ahrefs/top-pages", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/top-pages request");
    const intel = await getAhrefsIntelligence(req.log);
    res.json({ pages: intel.topPages, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/top-pages unexpected error");
    res.json({ pages: FALLBACK_AHREFS.topPages, source: "fallback" });
  }
});

// ── GET /api/ahrefs/traffic-potential ────────────────────────────────────
router.get("/ahrefs/traffic-potential", async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword ?? "");
  try {
    req.log.info({ keyword }, "ahrefs/traffic-potential request");
    const intel = await getAhrefsIntelligence(req.log);
    const match = keyword
      ? intel.keywordOpportunities.find(k => k.keyword.toLowerCase() === keyword.toLowerCase())
      : null;
    const trafficPotential = match?.trafficPotential ?? intel.trafficPotential;
    res.json({ keyword: keyword || "total", trafficPotential, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/traffic-potential unexpected error");
    res.json({ keyword, trafficPotential: FALLBACK_AHREFS.trafficPotential, source: "fallback" });
  }
});

// ── GET /api/ahrefs/referring-domains ────────────────────────────────────
router.get("/ahrefs/referring-domains", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/referring-domains request");
    const bl = await getAhrefsBacklinks(req.log);
    res.json({ referringDomains: bl.referringDomains, source: bl.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/referring-domains unexpected error");
    res.json({ referringDomains: FALLBACK_AHREFS.referringDomains, source: "fallback" });
  }
});

// ── GET /api/ahrefs/backlinks ─────────────────────────────────────────────
router.get("/ahrefs/backlinks", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/backlinks request");
    const bl = await getAhrefsBacklinks(req.log);
    res.json(bl);
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/backlinks unexpected error");
    res.json({ backlinks: FALLBACK_AHREFS.backlinks, referringDomains: FALLBACK_AHREFS.referringDomains, source: "fallback" });
  }
});

// ── GET /api/ahrefs/competitor-gap ───────────────────────────────────────
router.get("/ahrefs/competitor-gap", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/competitor-gap request");
    const intel = await getAhrefsIntelligence(req.log);
    res.json({ competitors: intel.competitorGap, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/competitor-gap unexpected error");
    res.json({ competitors: FALLBACK_AHREFS.competitorGap, source: "fallback" });
  }
});

// ── GET /api/ahrefs/content-gap ──────────────────────────────────────────
router.get("/ahrefs/content-gap", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/content-gap request");
    const intel = await getAhrefsIntelligence(req.log);
    const contentGap = intel.keywordOpportunities
      .filter(k => k.currentPosition === null || k.currentPosition > 20)
      .slice(0, 20);
    res.json({ keywords: contentGap, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/content-gap unexpected error");
    res.json({ keywords: FALLBACK_AHREFS.keywordOpportunities.slice(0, 10), source: "fallback" });
  }
});

// ── GET /api/ahrefs/domain-rating ────────────────────────────────────────
router.get("/ahrefs/domain-rating", async (req: Request, res: Response) => {
  try {
    req.log.info("ahrefs/domain-rating request");
    const dr = await getAhrefsDomainRating(req.log);
    res.json(dr);
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/domain-rating unexpected error");
    res.json({ domainRating: FALLBACK_AHREFS.domainRating, urlRating: FALLBACK_AHREFS.urlRating, source: "fallback" });
  }
});

// ── GET /api/ahrefs/url-rating ────────────────────────────────────────────
router.get("/ahrefs/url-rating", async (req: Request, res: Response) => {
  const url = String(req.query.url ?? "");
  try {
    req.log.info({ url }, "ahrefs/url-rating request");
    const intel = await getAhrefsIntelligence(req.log);
    res.json({ url: url || FALLBACK_AHREFS.topPages[0]?.url, urlRating: intel.urlRating, source: intel.source });
  } catch (err: any) {
    req.log.error({ err }, "ahrefs/url-rating unexpected error");
    res.json({ url, urlRating: FALLBACK_AHREFS.urlRating, source: "fallback" });
  }
});

export default router;
