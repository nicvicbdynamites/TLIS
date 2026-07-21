/**
 * Trends routes — live Google Trends data endpoints.
 *
 * This is the first live Research Provider for TLIS.
 * Future providers (Reddit, Ahrefs, SEMrush) follow this same route shape.
 *
 * GET /api/trends/luxury-summary      — composite dashboard summary (primary)
 * GET /api/trends/interest-over-time  — 7-day interest for a keyword
 * GET /api/trends/related-queries     — top + rising related queries
 * GET /api/trends/trending-searches   — today's US daily trending topics
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  getLuxurySummary,
  getTrendInterest,
  getTrendQueries,
  FALLBACK_SUMMARY,
} from "../services/google-trends.js";

// @ts-ignore — google-trends-api has no official type declarations
import googleTrends from "google-trends-api";

const router: IRouter = Router();

// ── GET /api/trends/luxury-summary ────────────────────────────────────────
router.get("/trends/luxury-summary", async (req: Request, res: Response) => {
  try {
    const data = await getLuxurySummary(req.log);
    res.json(data);
  } catch (err: any) {
    req.log.error({ err }, "trends/luxury-summary unexpected error");
    res.json(FALLBACK_SUMMARY);
  }
});

// ── GET /api/trends/interest-over-time ───────────────────────────────────
router.get("/trends/interest-over-time", async (req: Request, res: Response) => {
  const keywordsRaw = (req.query.keywords as string | undefined) ?? "quiet luxury";
  const keywords    = keywordsRaw.split(",").map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) { res.status(400).json({ error: "keywords query param required" }); return; }

  try {
    const data = await getTrendInterest(keywords, req.log);
    res.json({ keywords, data });
  } catch (err: any) {
    req.log.error({ err }, "trends/interest-over-time unexpected error");
    res.status(500).json({ error: "Failed to fetch interest data" });
  }
});

// ── GET /api/trends/related-queries ──────────────────────────────────────
router.get("/trends/related-queries", async (req: Request, res: Response) => {
  const keyword = (req.query.keyword as string | undefined)?.trim();
  if (!keyword) { res.status(400).json({ error: "keyword query param required" }); return; }

  try {
    const data = await getTrendQueries(keyword, req.log);
    res.json({ keyword, data });
  } catch (err: any) {
    req.log.error({ err }, "trends/related-queries unexpected error");
    res.status(500).json({ error: "Failed to fetch related queries" });
  }
});

// ── GET /api/trends/trending-searches ────────────────────────────────────
router.get("/trends/trending-searches", async (req: Request, res: Response) => {
  const geo = ((req.query.geo as string | undefined) ?? "US").toUpperCase();
  const cacheKey = `daily:${geo}`;

  try {
    req.log.info({ geo }, "trends/trending-searches request");
    const raw = await (new Promise<string>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error("timeout")), 8000);
      ((googleTrends as any).dailyTrends({ geo }) as Promise<string>)
        .then((v: string) => { clearTimeout(id); resolve(v); })
        .catch((e: unknown) => { clearTimeout(id); reject(e); });
    }));

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

    const topics = (parsed.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [])
      .slice(0, 10)
      .map(t => ({ title: String(t.title?.query ?? ""), traffic: String(t.formattedTraffic ?? "") }))
      .filter(t => t.title.length > 0);

    res.json({ geo, topics });
  } catch (err: any) {
    req.log.info({ errMessage: err?.message, geo }, "trends/trending-searches status updated");
    res.json({ geo, topics: FALLBACK_SUMMARY.trendingSearches.map(t => ({ title: t, traffic: "" })), source: "fallback" });
  }
});

// ── GET /api/trends/related-topics ───────────────────────────────────────
router.get("/trends/related-topics", async (req: Request, res: Response) => {
  const keyword = (req.query.keyword as string | undefined)?.trim();
  if (!keyword) { res.status(400).json({ error: "keyword query param required" }); return; }

  try {
    req.log.info({ keyword }, "trends/related-topics request");
    const raw = await (new Promise<string>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error("timeout")), 8000);
      ((googleTrends as any).relatedTopics({ keyword }) as Promise<string>)
        .then((v: string) => { clearTimeout(id); resolve(v); })
        .catch((e: unknown) => { clearTimeout(id); reject(e); });
    }));

    const parsed = JSON.parse(raw) as {
      default?: {
        rankedList?: Array<{
          rankedKeyword?: Array<{ topic?: { title?: string; type?: string }; value?: number | string }>;
        }>;
      };
    };

    const topList = parsed.default?.rankedList?.[0]?.rankedKeyword ?? [];
    const topics  = topList.slice(0, 8).map(t => ({
      title: String(t.topic?.title ?? ""),
      type:  String(t.topic?.type  ?? ""),
      value: Number(t.value ?? 0),
    })).filter(t => t.title.length > 0);

    res.json({ keyword, topics });
  } catch (err: any) {
    req.log.info({ errMessage: err?.message, keyword }, "trends/related-topics status updated");
    res.json({ keyword, topics: [], source: "fallback" });
  }
});

export default router;
