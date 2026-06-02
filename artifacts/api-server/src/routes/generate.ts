import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

type GenerationType = "hooks" | "captions" | "prompts" | "ideas";

function buildSystemPrompt(type: GenerationType): string {
  const base = `You are an elite TikTok content strategist specialising in luxury lifestyle creators. Your outputs are precise, evocative, and instantly actionable. Never use emojis. Write with authority and restraint — luxury is defined by what you leave out, not what you pile in.`;

  const instructions: Record<GenerationType, string> = {
    hooks: `Generate exactly 3 viral TikTok opening hooks (first 3 seconds of a video). Each hook must:
- Create immediate pattern interruption
- Speak directly to aspirational identity
- Be 1–2 sentences maximum
- Use POV framing, contrast, or curiosity gaps
- Feel like a conversation starter, not an ad
Return only the 3 hooks as a JSON array of strings. No numbering, no explanation.`,

    captions: `Generate exactly 3 TikTok captions. Each caption must:
- Be 2–4 sentences that extend the video's emotional message
- End with 4–6 targeted hashtags relevant to luxury and the niche
- Use rhythm and line breaks for readability
- Sound like a real person with refined taste, not a brand account
Return only the 3 captions as a JSON array of strings. No numbering, no explanation.`,

    prompts: `Generate exactly 3 cinematic video direction prompts. Each prompt must:
- Specify shot type, movement, lighting, and color grade
- Be precise enough for a solo creator to execute on a phone
- Describe what NOT to do as much as what to do
- Be 3–5 sentences long — dense, directive, visual
Return only the 3 prompts as a JSON array of strings. No numbering, no explanation.`,

    ideas: `Generate exactly 3 original viral content ideas. Each idea must:
- Have a clear hook-to-payload structure (what draws them in, what pays it off)
- Be format-specific and executable within a week
- Have genuine share-worthiness — something people would send to a friend
- Be 2–4 sentences describing the concept and why it works
Return only the 3 ideas as a JSON array of strings. No numbering, no explanation.`,
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

All outputs must be tailored precisely to this combination.`;
}

router.post("/generate", async (req, res) => {
  const { type, niche, style, tone, platform, audience } = req.body as {
    type: GenerationType;
    niche: string;
    style: string;
    tone: string;
    platform: string;
    audience: string;
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

  if (!process.env["OPENAI_API_KEY"]) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 800,
      messages: [
        { role: "system", content: buildSystemPrompt(type) },
        { role: "user", content: buildUserPrompt(type, niche, style, tone, platform, audience) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    let outputs: string[];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        outputs = parsed.map(String).slice(0, 3);
      } else {
        outputs = [String(parsed)];
      }
    } catch {
      outputs = raw
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    res.json({ outputs });
  } catch (err: any) {
    req.log.error({ err }, "OpenAI generation failed");

    if (err?.status === 429) {
      res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
      return;
    }
    if (err?.status === 401) {
      res.status(401).json({ error: "Invalid API key. Please check your OPENAI_API_KEY secret." });
      return;
    }

    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

export default router;
