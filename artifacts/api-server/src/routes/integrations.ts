/**
 * Integration routes — provider test + high-level AI helpers.
 * All Gemini calls are server-side; the API key never reaches the client.
 *
 * POST /api/integrations/gemini/test            — connection health check
 * POST /api/integrations/gemini/generate-text   — generic text
 * POST /api/integrations/gemini/research        — structured research result
 * POST /api/integrations/gemini/executive-brief — full creator brief
 * POST /api/integrations/gemini/content-ideas   — 3 viral content ideas
 *
 * Gemini research is silently enriched with three live context sources:
 *  1. Google Trends live data         (Phase 3.2)
 *  2. Reddit community data           (Phase 3.3)
 *  3. Google Search Console SEO data  (Phase 3.4)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  testConnection,
  generateText,
  generateResearch,
  generateExecutiveBrief,
  generateContentIdeas,
  errorMessage,
  type ContentIdeaParams,
} from "../services/gemini.js";
import { getLuxurySummary,       formatTrendContext  } from "../services/google-trends.js";
import { getLuxuryRedditSummary, formatRedditContext  } from "../services/reddit.js";
import { getSearchAnalytics,     formatGSCContext     } from "../services/search-console.js";

const router: IRouter = Router();

// ── POST /api/integrations/gemini/test ────────────────────────────────────

router.post("/integrations/gemini/test", async (req: Request, res: Response) => {
  try {
    const result = await testConnection(req.log);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "integrations/gemini/test unexpected error");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

// ── POST /api/integrations/gemini/generate-text ───────────────────────────

router.post("/integrations/gemini/generate-text", async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" }); return;
  }
  try {
    const result = await generateText(prompt.trim(), req.log);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "integrations/gemini/generate-text failed");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

// ── POST /api/integrations/gemini/research ────────────────────────────────

router.post("/integrations/gemini/research", async (req: Request, res: Response) => {
  const { query, niche } = req.body as { query?: string; niche?: string };
  if (!query || typeof query !== "string" || !query.trim()) {
    res.status(400).json({ error: "query is required" }); return;
  }
  try {
    // Silently enrich with all three live providers — non-critical, never block
    const [trendContext, redditContext, gscContext] = await Promise.all([
      getLuxurySummary(req.log)
        .then(s => s.source !== "fallback" ? formatTrendContext(s) : undefined)
        .catch(() => undefined),
      getLuxuryRedditSummary(req.log)
        .then(s => s.source !== "fallback" ? formatRedditContext(s) : undefined)
        .catch(() => undefined),
      getSearchAnalytics(req.log)
        .then(s => formatGSCContext(s))
        .catch(() => undefined),
    ]);

    const combined   = [trendContext, redditContext, gscContext].filter(Boolean).join("\n\n");
    const enrichment = combined.length > 0 ? combined : undefined;

    const result = await generateResearch(query.trim(), niche?.trim(), req.log, enrichment);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "integrations/gemini/research failed");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

// ── POST /api/integrations/gemini/executive-brief ─────────────────────────

router.post("/integrations/gemini/executive-brief", async (req: Request, res: Response) => {
  const { niche } = req.body as { niche?: string };
  try {
    const result = await generateExecutiveBrief(niche?.trim(), req.log);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "integrations/gemini/executive-brief failed");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

// ── POST /api/integrations/gemini/content-ideas ───────────────────────────

router.post("/integrations/gemini/content-ideas", async (req: Request, res: Response) => {
  const { niche, style, tone, platform, audience } = req.body as ContentIdeaParams;
  if (!niche || !style || !tone || !platform || !audience) {
    res.status(400).json({ error: "Missing required fields: niche, style, tone, platform, audience" }); return;
  }
  try {
    const result = await generateContentIdeas({ niche, style, tone, platform, audience }, req.log);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "integrations/gemini/content-ideas failed");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

export default router;
