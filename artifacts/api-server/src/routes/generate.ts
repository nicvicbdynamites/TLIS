import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

type GenerationType = "hooks" | "captions" | "prompts" | "ideas";

// ── Gemini client (lazy — validates key at first use) ──────────────────────
function getClient(): GoogleGenAI {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenAI({ apiKey: key });
}

// ── Prompt builders ────────────────────────────────────────────────────────
function buildSystemPrompt(type: GenerationType): string {
  const base = `You are an elite TikTok content strategist specialising in luxury lifestyle creators. Your outputs are precise, evocative, and instantly actionable. Never use emojis. Write with authority and restraint — luxury is defined by what you leave out, not what you pile in.`;

  const instructions: Record<GenerationType, string> = {
    hooks: `Generate exactly 3 viral TikTok opening hooks (first 3 seconds of a video). Each hook must:
- Create immediate pattern interruption
- Speak directly to aspirational identity
- Be 1–2 sentences maximum
- Use POV framing, contrast, or curiosity gaps
- Feel like a conversation starter, not an ad
Return ONLY a valid JSON array of exactly 3 strings. No markdown, no numbering, no explanation. Example: ["hook one", "hook two", "hook three"]`,

    captions: `Generate exactly 3 TikTok captions. Each caption must:
- Be 2–4 sentences that extend the video's emotional message
- End with 4–6 targeted hashtags relevant to luxury and the niche
- Use rhythm and line breaks for readability
- Sound like a real person with refined taste, not a brand account
Return ONLY a valid JSON array of exactly 3 strings. No markdown, no numbering, no explanation.`,

    prompts: `Generate exactly 3 cinematic video direction prompts. Each prompt must:
- Specify shot type, movement, lighting, and color grade
- Be precise enough for a solo creator to execute on a phone
- Describe what NOT to do as much as what to do
- Be 3–5 sentences long — dense, directive, visual
Return ONLY a valid JSON array of exactly 3 strings. No markdown, no numbering, no explanation.`,

    ideas: `Generate exactly 3 original viral content ideas. Each idea must:
- Have a clear hook-to-payload structure (what draws them in, what pays it off)
- Be format-specific and executable within a week
- Have genuine share-worthiness — something people would send to a friend
- Be 2–4 sentences describing the concept and why it works
Return ONLY a valid JSON array of exactly 3 strings. No markdown, no numbering, no explanation.`,
  };

  return `${base}\n\n${instructions[type]}`;
}

function buildUserPrompt(
  type: GenerationType,
  niche: string,
  style: string,
  tone: string,
  platform: string,
  audience: string
): string {
  return `Generate ${type} for a creator with this brief:
- Niche: ${niche}
- Video Style: ${style}
- Tone: ${tone}
- Platform: ${platform}
- Target Audience: ${audience}

All outputs must be tailored precisely to this combination. Return only the JSON array.`;
}

// ── Parse helpers ─────────────────────────────────────────────────────────
function parseOutputs(raw: string): string[] {
  // Strip markdown code fences if model wraps response
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean).slice(0, 3);
    if (typeof parsed === "string") return [parsed];
  } catch {
    // fallback: split on double newlines
  }
  return cleaned.split(/\n{2,}/).map(s => s.trim()).filter(Boolean).slice(0, 3);
}

// ── Rate-limit / retry helper ─────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  log: Request["log"]
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const isRate = err?.status === 429 || String(err?.message).includes("quota") || String(err?.message).includes("rate");
      const isTransient = err?.status >= 500 || err?.status === 503;
      if ((isRate || isTransient) && attempt < maxAttempts) {
        const delay = isRate ? 2000 * attempt : 800 * attempt;
        log.warn({ attempt, delay, err }, "Gemini retry");
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/generate  — non-streaming (kept for backward compat)
// ────────────────────────────────────────────────────────────────────────────
router.post("/generate", async (req: Request, res: Response) => {
  const { type, niche, style, tone, platform, audience } = req.body as {
    type: GenerationType; niche: string; style: string;
    tone: string; platform: string; audience: string;
  };

  if (!type || !niche || !style || !tone || !platform || !audience) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const validTypes: GenerationType[] = ["hooks", "captions", "prompts", "ideas"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid generation type" });
    return;
  }

  try {
    const ai = getClient();
    const raw = await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: buildSystemPrompt(type) + "\n\n" + buildUserPrompt(type, niche, style, tone, platform, audience) }] },
        ],
        config: { maxOutputTokens: 8192, temperature: 0.9 },
      });
      return response.text ?? "[]";
    }, 3, req.log);

    res.json({ outputs: parseOutputs(raw), model: "gemini-2.5-flash" });
  } catch (err: any) {
    req.log.error({ err }, "Gemini generation failed");
    if (err?.status === 429 || String(err?.message).includes("quota")) {
      res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
      return;
    }
    if (err?.message?.includes("GEMINI_API_KEY")) {
      res.status(500).json({ error: "Gemini API key not configured. Add GEMINI_API_KEY to Secrets." });
      return;
    }
    if (err?.status === 403 || String(err?.message).includes("PERMISSION_DENIED") || String(err?.message).includes("denied access")) {
      res.status(403).json({ error: "API key denied: your Google Cloud project does not have the Generative Language API enabled. Get a key from https://aistudio.google.com/apikey instead." });
      return;
    }
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/generate/stream  — SSE streaming, one output at a time
//
//  Protocol:
//    data: {"index":0,"chunk":"text..."}   — streaming chunk for output #index
//    data: {"index":0,"done":true}         — output #index complete, full text in "text"
//    data: {"error":"..."}                 — fatal error
//    data: {"complete":true,"count":3}     — all outputs done
// ────────────────────────────────────────────────────────────────────────────
router.post("/generate/stream", async (req: Request, res: Response) => {
  const { type, niche, style, tone, platform, audience } = req.body as {
    type: GenerationType; niche: string; style: string;
    tone: string; platform: string; audience: string;
  };

  if (!type || !niche || !style || !tone || !platform || !audience) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const validTypes: GenerationType[] = ["hooks", "captions", "prompts", "ideas"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid generation type" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const systemAndUser =
    buildSystemPrompt(type) + "\n\n" + buildUserPrompt(type, niche, style, tone, platform, audience);

  try {
    const ai = getClient();

    // Stream the full response — parse out the 3 items as they arrive
    // We stream the whole text then split, yielding each item as it completes
    let fullText = "";
    let emittedCount = 0;
    let lastEmittedEnd = 0;

    const attemptStream = async () => {
      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: systemAndUser }] },
        ],
        config: { maxOutputTokens: 8192, temperature: 0.9 },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (!text) continue;
        fullText += text;

        // Try to detect completed items from the growing JSON array
        // We look for complete quoted strings at depth 1
        const partial = fullText.trim();
        // Stream raw chars as a chunk for the current in-progress item
        send({ index: emittedCount, chunk: text });
      }
    };

    // Retry on transient errors
    let attempts = 0;
    while (attempts < 3) {
      try {
        await attemptStream();
        break;
      } catch (err: any) {
        attempts++;
        const isRate = err?.status === 429 || String(err?.message).includes("quota");
        const isTransient = err?.status >= 500 || err?.status === 503;
        if ((isRate || isTransient) && attempts < 3) {
          const delay = isRate ? 2000 * attempts : 800 * attempts;
          req.log.warn({ attempt: attempts, delay, err }, "Gemini stream retry");
          // Signal client to show retry state
          send({ retrying: true, attempt: attempts });
          await new Promise(r => setTimeout(r, delay));
          fullText = "";
          emittedCount = 0;
          lastEmittedEnd = 0;
          continue;
        }
        throw err;
      }
    }

    // Parse the complete response into outputs
    const outputs = parseOutputs(fullText);

    // Emit each output as a complete item
    for (let i = 0; i < outputs.length; i++) {
      send({ index: i, output: outputs[i], done: true });
    }

    send({ complete: true, count: outputs.length, model: "gemini-2.5-flash" });
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "Gemini stream failed");
    const isRate = err?.status === 429 || String(err?.message).includes("quota");
    if (isRate) {
      send({ error: "Rate limit reached. Please wait a moment and try again.", code: "RATE_LIMIT" });
    } else if (err?.message?.includes("GEMINI_API_KEY")) {
      send({ error: "Gemini API key not configured.", code: "NO_KEY" });
    } else {
      const isPerm = err?.status === 403 || String(err?.message).includes("PERMISSION_DENIED") || String(err?.message).includes("denied access");
      if (isPerm) {
        send({ error: "API key denied: your Google Cloud project does not have the Generative Language API enabled. Get a working key from https://aistudio.google.com/apikey", code: "PERMISSION_DENIED" });
      } else {
        send({ error: "Generation failed. Please try again.", code: "ERROR" });
      }
    }
    res.end();
  }
});

export default router;
