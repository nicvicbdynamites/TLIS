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

function getFallbackOutputs(type: GenerationType, niche: string): string[] {
  if (type === "hooks") {
    return [
      `POV: You discovered the ${niche} secret that Silicon Valley leaders rely on...`,
      `Stop scrolling if you want to master ${niche} without loud logos or hype.`,
      `The 3 minimalist ${niche} rules nobody talks about on TikTok.`
    ];
  }
  if (type === "captions") {
    return [
      `Quiet luxury isn't about flexing. It's about quiet confidence and curated quality in ${niche}. ✨`,
      `Less noise, more depth. Here is how we approach ${niche} in 2026. #QuietLuxury #${niche.replace(/\s+/g, '')}`,
      `Three simple steps to elevate your ${niche} routine starting today.`
    ];
  }
  if (type === "prompts") {
    return [
      `Write a 60-second TikTok script for a ${niche} GRWM video with natural lighting and soft voiceover.`,
      `Generate 5 high-converting headline hooks for a ${niche} visual carousel.`,
      `Create a minimalist caption outlining top 3 recommendations for ${niche}.`
    ];
  }
  return [
    `Create a 3-part aesthetic video series around ${niche} daily routines.`,
    `Feature a behind-the-scenes look at how curated ${niche} products are chosen.`,
    `Highlight a comparison between mass market vs quiet luxury approaches in ${niche}.`
  ];
}

function getFallbackContentPack(niche: string): ContentPack {
  return {
    hook: `POV: You discovered the ${niche} secret that Silicon Valley leaders rely on...`,
    caption: `Quiet luxury isn't about flexing. It's about quiet confidence and curated quality in ${niche}. Less noise, more depth.`,
    video_prompt: `60-second TikTok script for a ${niche} video with soft natural morning light, minimal camera movement, and warm color grade.`,
    hashtags: ["#QuietLuxury", `#${niche.replace(/\s+/g, '')}`, "#AspirationalLifestyle", "#Minimalism", "#LuxuryLifestyle"],
    cta: `Save this for your next ${niche} visual breakdown.`,
    best_posting_time: `Tuesday 7–9 PM — peak scroll window for aspirational ${niche} content.`
  };
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
    req.log.info({ errMessage: err?.message }, "Gemini /generate fallback activated");
    res.json({ outputs: getFallbackOutputs(type, niche), model: "cached-fallback" });
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
    req.log.info({ errMessage: err?.message }, "Gemini /generate/stream fallback activated");
    const outputs = getFallbackOutputs(type, niche);
    for (let i = 0; i < outputs.length; i++) {
      send({ index: i, output: outputs[i], done: true });
    }
    send({ complete: true, count: outputs.length, model: "cached-fallback" });
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
    req.log.info({ errMessage: err?.message }, "Gemini /generate/content-pack fallback activated");
    res.json({ pack: getFallbackContentPack(niche), model: "cached-fallback" });
  }
});

export default router;
