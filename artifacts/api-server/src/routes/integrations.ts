/**
 * Integration routes — provider test + high-level AI helpers.
 * All Gemini calls are server-side; the API key never reaches the client.
 *
 * POST /api/integrations/gemini/test            — connection health check
 * POST /api/integrations/gemini/generate-text   — generic text
 * POST /api/integrations/gemini/research        — structured research result
 * POST /api/integrations/gemini/executive-brief — full creator brief
 * POST /api/integrations/gemini/content-ideas   — 3 viral content ideas
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
import { getLuxurySummary, formatTrendContext } from "../services/google-trends.js";

const router: IRouter = Router();

// ── POST /api/integrations/gemini/test ────────────────────────────────────

router.post("/integrations/gemini/test", async (req: Request, res: Response) => {
  try {
    const result = await testConnection(req.log);
    // Always 200 — success/failure is inside the result object
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
    // Silently enrich with live trend data — non-critical, never blocks the request
    let trendContext: string | undefined;
    try {
      const summary = await getLuxurySummary(req.log);
      if (summary.source !== "fallback") trendContext = formatTrendContext(summary);
    } catch {
      // Trend enrichment is optional — Gemini still runs without it
    }

    const result = await generateResearch(query.trim(), niche?.trim(), req.log, trendContext);
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
