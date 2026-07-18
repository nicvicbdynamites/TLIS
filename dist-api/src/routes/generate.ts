import { Router, type IRouter, type Request, type Response } from "express";
import {
  generateWithCascade,
  streamWithCascade,
  errorMessage,
} from "../services/gemini.js";

const router: IRouter = Router();

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
  return cleaned
    .split(/\n{2,}|\n(?=\d+\.)/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
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
        send({ index: 0, chunk });
      },
      req.log,
    );

    const outputs = parseOutputs(fullText);
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
//  POST /api/generate/content-pack
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
