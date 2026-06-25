import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

// ── Model cascade: try in order, skip on 403/404, retry on 429 ──────────
// gemini-2.5-flash  — current recommended model, requires billing or allowlisted project
// gemini-2.0-flash  — previous gen (free-tier friendly, may be deprecated on paid projects)
// gemini-1.5-flash  — stable fallback available on most project types
const MODEL_CASCADE = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

function getClient(): GoogleGenAI {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("GEMINI_API_KEY_MISSING");
  return new GoogleGenAI({ apiKey: key });
}

type GenerationType = "hooks" | "captions" | "prompts" | "ideas" | "content-pack";

// ── Content Pack types ─────────────────────────────────────────────────────
export interface ContentPack {
  hook: string;
  caption: string;
  video_prompt: string;
  hashtags: string[];
  cta: string;
  best_posting_time: string;
}

// ── Prompt builders ────────────────────────────────────────────────────────
function buildContentPackPrompt(
  niche: string, style: string, tone: string, platform: string, audience: string,
): string {
  return `You are an elite TikTok content strategist specialising in luxury lifestyle creators. Your outputs are precise, evocative, and instantly actionable. Never use emojis. Write with authority and restraint.

Generate a complete content pack for a single luxury TikTok video. Return ONLY a valid JSON object with exactly these six keys. No markdown fences, no extra keys, no explanation.

{
  "hook": "One viral opening line (1–2 sentences). Pattern interruption, POV framing, or curiosity gap. Engineered for the first 3 seconds.",
  "caption": "2–4 sentence caption that extends the video's emotional message. End with exactly 5 targeted hashtags on a new line.",
  "video_prompt": "3–5 sentence cinematic direction. Specify shot type, movement, lighting, colour grade, and what NOT to do. Precise enough for a solo creator with a phone.",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7"],
  "cta": "One direct call-to-action sentence. Specific, not generic. Matches the tone and niche.",
  "best_posting_time": "One sentence naming the optimal day and time window with a brief reason (e.g. 'Tuesday 7–9 PM — peak scroll window for aspirational content')."
}

Creator brief:
- Niche: ${niche}
- Video Style: ${style}
- Tone: ${tone}
- Platform: ${platform}
- Target Audience: ${audience}`;
}

function parseContentPack(raw: string): ContentPack {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<ContentPack>;
    return {
      hook:              String(parsed.hook              ?? ""),
      caption:           String(parsed.caption           ?? ""),
      video_prompt:      String(parsed.video_prompt      ?? ""),
      hashtags:          Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
      cta:               String(parsed.cta               ?? ""),
      best_posting_time: String(parsed.best_posting_time ?? ""),
    };
  } catch {
    return { hook: raw, caption: "", video_prompt: "", hashtags: [], cta: "", best_posting_time: "" };
  }
}

function buildPrompt(
  type: GenerationType,
  niche: string,
  style: string,
  tone: string,
  platform: string,
  audience: string,
): string {
  const instructions: Record<GenerationType, string> = {
    hooks: `Generate exactly 3 viral TikTok opening hooks (first 3 seconds of a video). Each hook must:
- Create immediate pattern interruption
- Speak directly to aspirational identity
- Be 1–2 sentences maximum
- Use POV framing, contrast, or curiosity gaps
- Feel like a conversation starter, not an ad`,

    captions: `Generate exactly 3 TikTok captions. Each caption must:
- Be 2–4 sentences that extend the video's emotional message
- End with 4–6 targeted hashtags relevant to luxury and the niche
- Use rhythm and line breaks for readability
- Sound like a real person with refined taste, not a brand account`,

    prompts: `Generate exactly 3 cinematic video direction prompts. Each prompt must:
- Specify shot type, movement, lighting, and color grade
- Be precise enough for a solo creator to execute on a phone
- Describe what NOT to do as much as what to do
- Be 3–5 sentences long — dense, directive, visual`,

    ideas: `Generate exactly 3 original viral content ideas. Each idea must:
- Have a clear hook-to-payload structure (what draws them in, what pays it off)
- Be format-specific and executable within a week
- Have genuine share-worthiness — something people would send to a friend
- Be 2–4 sentences describing the concept and why it works`,

    "content-pack": "",
  };

  return `You are an elite TikTok content strategist specialising in luxury lifestyle creators. Your outputs are precise, evocative, and instantly actionable. Never use emojis. Write with authority and restraint.

${instructions[type]}

Return ONLY a valid JSON array of exactly 3 strings. No markdown fences, no numbering, no explanation.
Example format: ["output one", "output two", "output three"]

Creator brief:
- Niche: ${niche}
- Video Style: ${style}
- Tone: ${tone}
- Platform: ${platform}
- Target Audience: ${audience}`;
}

// ── Parse helpers ─────────────────────────────────────────────────────────
function parseOutputs(raw: string): string[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean).slice(0, 3);
    if (typeof parsed === "string") return [parsed];
  } catch {
    // ignore
  }
  // fallback: split on double newlines or numbered lines
  return cleaned
    .split(/\n{2,}|\n(?=\d+\.)/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

// ── Error classifiers ─────────────────────────────────────────────────────
function isRateLimit(err: any): boolean {
  return (
    err?.status === 429 ||
    String(err?.message).includes("quota") ||
    String(err?.message).includes("RESOURCE_EXHAUSTED")
  );
}

function isCreditsDepleted(err: any): boolean {
  return (
    err?.status === 429 &&
    String(err?.message).includes("prepayment credits are depleted")
  );
}

function isPermDenied(err: any): boolean {
  return (
    err?.status === 403 ||
    err?.status === 404 ||
    String(err?.message).includes("PERMISSION_DENIED") ||
    String(err?.message).includes("denied access") ||
    String(err?.message).includes("NOT_FOUND")
  );
}

function isMissingKey(err: any): boolean {
  return (
    err?.message === "GEMINI_API_KEY_MISSING" ||
    String(err?.message).includes("API_KEY_INVALID") ||
    (err?.status === 400 && String(err?.message).includes("valid API key"))
  );
}

// ── Core generation with model cascade + retry ───────────────────────────
async function generateWithCascade(
  prompt: string,
  log: Request["log"],
): Promise<{ text: string; model: string }> {
  const ai = getClient();
  let lastErr: unknown;

  for (const model of MODEL_CASCADE) {
    // Up to 3 retries per model (for rate limits with backoff)
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

        if (isPermDenied(err)) {
          // This model is blocked for this key — skip to next model immediately
          log.warn({ model }, "Model permission denied, trying next in cascade");
          break;
        }

        if (isMissingKey(err)) throw err; // No point retrying

        if (isRateLimit(err) && attempt < 3) {
          const delay = 1500 * attempt; // 1.5s, 3s
          log.warn({ model, attempt, delay }, "Rate limited, backing off");
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Transient server error
        if ((err?.status >= 500 || err?.status === 503) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }

        // Any other error on last attempt — try next model
        break;
      }
    }
  }

  throw lastErr;
}

// ── Stream generation with cascade ───────────────────────────────────────
async function streamWithCascade(
  prompt: string,
  onChunk: (text: string) => void,
  log: Request["log"],
): Promise<{ model: string }> {
  const ai = getClient();
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

        if (isPermDenied(err)) { break; }
        if (isMissingKey(err)) throw err;

        if (isRateLimit(err) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
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

// ── Error response helpers ────────────────────────────────────────────────
function errorMessage(err: any): { status: number; message: string; code: string } {
  if (isMissingKey(err)) {
    return { status: 500, code: "NO_KEY", message: "Gemini API key not configured or invalid. Check your GEMINI_API_KEY secret." };
  }
  if (isCreditsDepleted(err)) {
    return { status: 429, code: "CREDITS_DEPLETED", message: "Prepaid billing credits are depleted on this API key's project. Add credits at ai.studio/projects or switch to a free-tier key from a new project." };
  }
  if (isRateLimit(err)) {
    return { status: 429, code: "QUOTA_EXHAUSTED", message: "Daily quota exhausted on all models. The free tier resets at midnight Pacific time. You can get a fresh API key at aistudio.google.com/apikey or enable billing to lift the limit." };
  }
  if (isPermDenied(err)) {
    return { status: 403, code: "PERMISSION_DENIED", message: "All available models are blocked for this API key. Get a free key at aistudio.google.com/apikey and update GEMINI_API_KEY in Secrets." };
  }
  return { status: 500, code: "ERROR", message: "Generation failed. Please try again." };
}

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/generate  — non-streaming JSON response
// ────────────────────────────────────────────────────────────────────────────
router.post("/generate", async (req: Request, res: Response) => {
  const { type, niche, style, tone, platform, audience } = req.body as {
    type: GenerationType; niche: string; style: string;
    tone: string; platform: string; audience: string;
  };

  const validTypes: GenerationType[] = ["hooks", "captions", "prompts", "ideas"];
  if (!type || !niche || !style || !tone || !platform || !audience) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid generation type" }); return;
  }

  try {
    const prompt = buildPrompt(type, niche, style, tone, platform, audience);
    const { text, model } = await generateWithCascade(prompt, req.log);
    res.json({ outputs: parseOutputs(text), model });
  } catch (err: any) {
    req.log.error({ err }, "Gemini /generate failed");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/generate/stream  — SSE streaming response
//
//  SSE protocol:
//    data: {"index":N,"chunk":"..."}        streaming chunk for output #N
//    data: {"index":N,"output":"...","done":true}  output #N complete
//    data: {"retrying":true,"attempt":N}    server retrying on rate limit
//    data: {"error":"...","code":"..."}     fatal error
//    data: {"complete":true,"count":N,"model":"..."} all done
// ────────────────────────────────────────────────────────────────────────────
router.post("/generate/stream", async (req: Request, res: Response) => {
  const { type, niche, style, tone, platform, audience } = req.body as {
    type: GenerationType; niche: string; style: string;
    tone: string; platform: string; audience: string;
  };

  const validTypes: GenerationType[] = ["hooks", "captions", "prompts", "ideas"];
  if (!type || !niche || !style || !tone || !platform || !audience) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid generation type" }); return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const prompt = buildPrompt(type, niche, style, tone, platform, audience);
    let fullText = "";

    const { model } = await streamWithCascade(
      prompt,
      (chunk) => {
        fullText += chunk;
        // Stream raw chunks as index-0 while building up
        send({ index: 0, chunk });
      },
      req.log,
    );

    // Parse the complete response into up to 3 outputs
    const outputs = parseOutputs(fullText);

    // Emit each parsed output as a complete item
    for (let i = 0; i < outputs.length; i++) {
      send({ index: i, output: outputs[i], done: true });
    }

    send({ complete: true, count: outputs.length, model });
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "Gemini /generate/stream failed");
    const { message, code } = errorMessage(err);
    send({ error: message, code });
    res.end();
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/generate/content-pack  — returns one structured ContentPack
// ────────────────────────────────────────────────────────────────────────────
router.post("/generate/content-pack", async (req: Request, res: Response) => {
  const { niche, style, tone, platform, audience } = req.body as {
    niche: string; style: string; tone: string; platform: string; audience: string;
  };

  if (!niche || !style || !tone || !platform || !audience) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  try {
    const prompt = buildContentPackPrompt(niche, style, tone, platform, audience);
    const { text, model } = await generateWithCascade(prompt, req.log);
    const pack = parseContentPack(text);
    res.json({ pack, model });
  } catch (err: any) {
    req.log.error({ err }, "Gemini /generate/content-pack failed");
    const { status, message } = errorMessage(err);
    res.status(status).json({ error: message });
  }
});

export default router;
