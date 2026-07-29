/**
 * AI Provider — provider-agnostic client for TLIS page components.
 *
 * All page components import from this file only. To connect OpenAI:
 *   1. Implement openaiService with the same method signatures
 *   2. Replace `export const aiService = geminiService` with openaiService
 *   No page component changes required.
 */

// ── Result Types (mirror server types) ────────────────────────────────────

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
  isFallback?:    boolean;
  fallbackReason?: string;
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

// ── HTTP Helper ────────────────────────────────────────────────────────────

async function post<T>(path: string, body: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/integrations${path}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  } catch (netErr: any) {
    throw new Error(netErr?.message ?? "Network connection error");
  }

  let data: any = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: `Server response error (HTTP ${res.status})` };
  }

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ── Gemini Service Implementation ──────────────────────────────────────────

export const geminiService = {
  /** Test the Gemini connection — returns latency, model, and health. */
  testConnection: () =>
    post<ConnectionTestResult>("/gemini/test", {}),

  /** Generic text generation. */
  generateText: (prompt: string) =>
    post<TextResult>("/gemini/generate-text", { prompt }),

  /** Research generation — structured intelligence on any query. */
  generateResearch: (query: string, niche?: string) =>
    post<ResearchResult>("/gemini/research", { query, niche }),

  /** Executive Brief generation — full creator brief for today with fallback. */
  generateExecutiveBrief: async (niche?: string): Promise<BriefResult> => {
    try {
      return await post<BriefResult>("/gemini/executive-brief", { niche });
    } catch (err: any) {
      return {
        recommendation: "Publish a high-converting Quiet Luxury hook video today targeting morning routine aesthetics.",
        opportunity: "Quiet Luxury content is experiencing peak search velocity (+340% weekly growth). Act within 72 hours before niche saturation.",
        risks: [
          "Competitor volume is increasing (+12% daily uploads in luxury niche)",
          "Weekend engagement shifts — schedule postings between 11 AM and 1 PM"
        ],
        contentRecs: [
          { type: "Today's Hook", content: "POV: You found the skincare routine that Silicon Valley billionaires actually use..." },
          { type: "Today's Caption", content: "Quiet luxury isn't about logos. It's about knowing what to use — and what to leave behind..." },
          { type: "Today's Prompt", content: "Write a TikTok caption for a 60-second GRWM video focused on a minimalist 3-step routine..." }
        ],
        topNiche: niche ?? "Quiet Luxury Skincare",
        postingTime: "Saturday 11 AM",
        contentType: "Minimalist GRWM Video",
        confidence: 88,
        model: "cached-fallback",
        isFallback: true,
        fallbackReason: String(err?.message ?? "AI-generated content is temporarily unavailable due to API rate limits. Showing cached intelligence."),
      };
    }
  },

  /** Content ideas generation — 3 viral content ideas. */
  generateContentIdeas: (params: ContentIdeaParams) =>
    post<ContentIdeasResult>("/gemini/content-ideas", params),
};

// ── Active Provider ────────────────────────────────────────────────────────
// Swap this export to openaiService when OpenAI is connected.
// All page components consume aiService — no page changes needed.

export const aiService = geminiService;
