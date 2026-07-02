/**
 * Gemini Service — central AI reasoning layer for TLIS.
 *
 * Exports:
 *   - Low-level: getGeminiClient, generateWithCascade, streamWithCascade, errorMessage
 *   - High-level: testConnection, generateText, generateResearch,
 *                 generateExecutiveBrief, generateContentIdeas
 *
 * Architecture note: all page components consume the AIProvider interface so
 * that OpenAI (or any future provider) can plug in via ai-provider.ts on the
 * frontend without touching any route handler or page component.
 */

import { GoogleGenAI } from "@google/genai";
import type { Request } from "express";
import { logger as rootLogger } from "../lib/logger.js";

// ── Shared log type ────────────────────────────────────────────────────────

export type Log = Request["log"] | typeof rootLogger;

// ── Result Types (exported for use in routes + frontend types) ─────────────

export interface ConnectionTestResult {
  success:   boolean;
  model:     string;
  latencyMs: number;
  timestamp: string;
  status:    "Healthy" | "Error" | "Unconfigured";
  error?:    string;
}

export interface TextResult {
  text:  string;
  model: string;
}

export interface ResearchResult {
  summary:       string;
  insights:      string[];
  opportunities: string[];
  risks:         string[];
  confidence:    number;
  model:         string;
}

export interface BriefResult {
  recommendation: string;
  opportunity:    string;
  risks:          string[];
  contentRecs:    { type: string; content: string }[];
  topNiche:       string;
  postingTime:    string;
  contentType:    string;
  confidence:     number;
  model:          string;
}

export interface ContentIdeasResult {
  ideas: string[];
  model: string;
}

export interface ContentIdeaParams {
  niche:    string;
  style:    string;
  tone:     string;
  platform: string;
  audience: string;
}

// ── Model Cascade ──────────────────────────────────────────────────────────
// gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
// Ordered best→fastest; each skipped on 403/404, retried on 429

export const MODEL_CASCADE = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

// ── Client Factory ─────────────────────────────────────────────────────────

export function getGeminiClient(): GoogleGenAI {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("GEMINI_API_KEY_MISSING");
  return new GoogleGenAI({ apiKey: key });
}

// ── Error Classifiers ──────────────────────────────────────────────────────

export function isRateLimit(err: any): boolean {
  return (
    err?.status === 429 ||
    String(err?.message).includes("quota") ||
    String(err?.message).includes("RESOURCE_EXHAUSTED")
  );
}

export function isCreditsDepleted(err: any): boolean {
  const msg = String(err?.message ?? "");
  return (
    err?.status === 429 && (
      msg.includes("prepayment credits are depleted") ||
      msg.includes("monthly spending cap") ||
      msg.includes("spend")
    )
  );
}

export function isPermDenied(err: any): boolean {
  return (
    err?.status === 403 ||
    err?.status === 404 ||
    String(err?.message).includes("PERMISSION_DENIED") ||
    String(err?.message).includes("denied access") ||
    String(err?.message).includes("NOT_FOUND")
  );
}

export function isMissingKey(err: any): boolean {
  return (
    err?.message === "GEMINI_API_KEY_MISSING" ||
    String(err?.message).includes("API_KEY_INVALID") ||
    (err?.status === 400 && String(err?.message).includes("valid API key"))
  );
}

// ── Error Response Helper ──────────────────────────────────────────────────

export function errorMessage(err: any): { status: number; message: string; code: string } {
  if (isMissingKey(err)) {
    return { status: 500, code: "NO_KEY", message: "Gemini API key not configured or invalid. Check your GEMINI_API_KEY secret." };
  }
  if (isCreditsDepleted(err)) {
    return { status: 429, code: "CREDITS_DEPLETED", message: "Your Google AI Studio project has exceeded its monthly spending cap." };
  }
  if (isRateLimit(err)) {
    return { status: 429, code: "QUOTA_EXHAUSTED", message: "Daily free-tier quota exhausted on all models. Quota resets at midnight Pacific." };
  }
  if (isPermDenied(err)) {
    return { status: 403, code: "PERMISSION_DENIED", message: "All available models are blocked for this API key." };
  }
  return { status: 500, code: "ERROR", message: "Generation failed. Please try again." };
}

// ── JSON Parse Helper ──────────────────────────────────────────────────────

function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ── Core Cascade (non-streaming) ───────────────────────────────────────────

export async function generateWithCascade(
  prompt: string,
  log: Log,
): Promise<{ text: string; model: string }> {
  const ai = getGeminiClient();
  let lastErr: unknown;

  for (const model of MODEL_CASCADE) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log.info({ model, attempt }, "Gemini generate attempt");
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 8192, temperature: 0.9 },
        });
        const text = response.text ?? "[]";
        log.info({ model, attempt }, "Gemini generate success");
        return { text, model };
      } catch (err: any) {
        lastErr = err;
        log.warn({ model, attempt, status: err?.status }, "Gemini attempt failed");

        if (isCreditsDepleted(err)) {
          log.error({ model }, "Spending cap exceeded, aborting cascade");
          throw err;
        }
        if (isPermDenied(err)) {
          log.warn({ model }, "Model permission denied, trying next in cascade");
          break;
        }
        if (isMissingKey(err)) throw err;
        if (isRateLimit(err) && attempt < 3) {
          const delay = 5000 * attempt;
          log.warn({ model, attempt, delay }, "Rate limited, backing off");
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if ((err?.status >= 500 || err?.status === 503) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        break;
      }
    }
  }
  throw lastErr;
}

// ── Core Cascade (streaming) ───────────────────────────────────────────────

export async function streamWithCascade(
  prompt: string,
  onChunk: (text: string) => void,
  log: Log,
): Promise<{ model: string }> {
  const ai = getGeminiClient();
  let lastErr: unknown;

  for (const model of MODEL_CASCADE) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log.info({ model, attempt }, "Gemini stream attempt");
        const stream = await ai.models.generateContentStream({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 8192, temperature: 0.9 },
        });
        for await (const chunk of stream) {
          const t = chunk.text;
          if (t) onChunk(t);
        }
        log.info({ model, attempt }, "Gemini stream success");
        return { model };
      } catch (err: any) {
        lastErr = err;
        log.warn({ model, attempt, status: err?.status }, "Gemini stream attempt failed");

        if (isCreditsDepleted(err)) { throw err; }
        if (isPermDenied(err))      { break; }
        if (isMissingKey(err))       throw err;
        if (isRateLimit(err) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 5000 * attempt));
          continue;
        }
        if ((err?.status >= 500 || err?.status === 503) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        break;
      }
    }
  }
  throw lastErr;
}

// ── High-Level Service Methods ─────────────────────────────────────────────

/**
 * Test the Gemini connection. Performs a lightweight round-trip and returns
 * latency, model used, and health status. Never exposes the API key.
 */
export async function testConnection(log: Log): Promise<ConnectionTestResult> {
  const timestamp = new Date().toISOString();

  if (!process.env["GEMINI_API_KEY"]) {
    log.warn("testConnection: GEMINI_API_KEY not set");
    return { success: false, model: "—", latencyMs: 0, timestamp, status: "Unconfigured", error: "GEMINI_API_KEY is not configured." };
  }

  const start = Date.now();
  try {
    const { model } = await generateWithCascade(
      'Respond with only the single word: ok',
      log,
    );
    const latencyMs = Date.now() - start;
    log.info({ model, latencyMs }, "Gemini testConnection success");
    return { success: true, model, latencyMs, timestamp, status: "Healthy" };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const { message } = errorMessage(err);
    log.error({ err, latencyMs }, "Gemini testConnection failed");
    return { success: false, model: "—", latencyMs, timestamp, status: "Error", error: message };
  }
}

/**
 * Generic text generation — returns the raw model output and the model used.
 */
export async function generateText(prompt: string, log: Log): Promise<TextResult> {
  const { text, model } = await generateWithCascade(prompt, log);
  return { text, model };
}

/**
 * Research generation — returns structured intelligence about a query topic.
 * Used by: Research Command Center → AI Research Assistant
 */
export async function generateResearch(
  query: string,
  niche: string = "Quiet Luxury Lifestyle",
  log: Log,
): Promise<ResearchResult> {
  const prompt = `You are an elite luxury content strategist and market researcher for TikTok creators.

Research the following for a luxury lifestyle creator:
Query: "${query}"
Creator niche: ${niche}

Return ONLY a valid JSON object with exactly these keys. No markdown fences, no extra keys, no explanation.

{
  "summary": "2-3 sentence executive summary of the research findings",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "risks": ["risk 1", "risk 2"],
  "confidence": <integer 70-98>
}`;

  const { text, model } = await generateWithCascade(prompt, log);
  const raw = parseJson<Partial<ResearchResult>>(text, {});

  return {
    summary:       String(raw.summary       ?? "Research complete."),
    insights:      Array.isArray(raw.insights)      ? raw.insights.map(String)      : [],
    opportunities: Array.isArray(raw.opportunities) ? raw.opportunities.map(String) : [],
    risks:         Array.isArray(raw.risks)         ? raw.risks.map(String)         : [],
    confidence:    typeof raw.confidence === "number" ? raw.confidence : 85,
    model,
  };
}

/**
 * Executive Brief generation — returns a full creator brief for today.
 * Used by: Executive Brief page → Generate AI Brief
 */
export async function generateExecutiveBrief(
  niche: string = "Quiet Luxury Lifestyle",
  log: Log,
): Promise<BriefResult> {
  const prompt = `You are the AI intelligence engine for a luxury TikTok creator.

Generate a comprehensive executive brief for today. Creator niche: ${niche}.

Return ONLY a valid JSON object with exactly these keys. No markdown fences, no explanation.

{
  "recommendation": "One specific, actionable content action to take today (1 sentence)",
  "opportunity": "The single biggest content opportunity right now (2-3 sentences)",
  "risks": ["risk 1 (1 sentence)", "risk 2 (1 sentence)"],
  "contentRecs": [
    { "type": "Today's Hook", "content": "One viral opening line for a 60-second video" },
    { "type": "Today's Caption", "content": "A 2-3 sentence caption ending with 5 hashtags" },
    { "type": "Today's Prompt", "content": "A concise AI video direction prompt for a solo creator" }
  ],
  "topNiche": "The fastest-growing niche this week (3-5 words)",
  "postingTime": "Optimal posting day and time with a brief reason (1 sentence)",
  "contentType": "Recommended content format and why (1 sentence)",
  "confidence": <integer 80-98>
}`;

  const { text, model } = await generateWithCascade(prompt, log);
  const raw = parseJson<Partial<BriefResult>>(text, {});

  return {
    recommendation: String(raw.recommendation ?? "Publish a hook video targeting your top niche today."),
    opportunity:    String(raw.opportunity    ?? "Strong trend alignment detected. Act within 72 hours."),
    risks:          Array.isArray(raw.risks)        ? raw.risks.map(String)        : [],
    contentRecs:    Array.isArray(raw.contentRecs)  ? raw.contentRecs              : [],
    topNiche:       String(raw.topNiche      ?? niche),
    postingTime:    String(raw.postingTime   ?? "Saturday 11 AM"),
    contentType:    String(raw.contentType   ?? "Get Ready With Me (GRWM)"),
    confidence:     typeof raw.confidence === "number" ? raw.confidence : 90,
    model,
  };
}

/**
 * Content ideas generation — returns 3 structured viral content ideas.
 * Used by: AI Content Generator (generator.tsx) ideas tab
 */
export async function generateContentIdeas(
  params: ContentIdeaParams,
  log: Log,
): Promise<ContentIdeasResult> {
  const { niche, style, tone, platform, audience } = params;
  const prompt = `You are an elite TikTok content strategist specialising in luxury lifestyle creators. Never use emojis. Write with authority and restraint.

Generate exactly 3 original viral content ideas. Each idea must:
- Have a clear hook-to-payload structure (what draws them in, what pays it off)
- Be format-specific and executable within a week
- Have genuine share-worthiness — something people would send to a friend
- Be 2-4 sentences describing the concept and why it works

Return ONLY a valid JSON array of exactly 3 strings. No markdown fences, no numbering, no explanation.
Example format: ["idea one", "idea two", "idea three"]

Creator brief:
- Niche: ${niche}
- Video Style: ${style}
- Tone: ${tone}
- Platform: ${platform}
- Target Audience: ${audience}`;

  const { text, model } = await generateWithCascade(prompt, log);
  const cleaned = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```$/m, "").trim();
  let ideas: string[] = [];
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) ideas = parsed.map(String).filter(Boolean).slice(0, 3);
  } catch {
    ideas = cleaned.split(/\n{2,}/).map(s => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean).slice(0, 3);
  }

  return { ideas, model };
}
