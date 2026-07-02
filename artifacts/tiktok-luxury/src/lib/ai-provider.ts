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
  const res = await fetch(`/api/integrations${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: "Failed to parse response" }));
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

  /** Executive Brief generation — full creator brief for today. */
  generateExecutiveBrief: (niche?: string) =>
    post<BriefResult>("/gemini/executive-brief", { niche }),

  /** Content ideas generation — 3 viral content ideas. */
  generateContentIdeas: (params: ContentIdeaParams) =>
    post<ContentIdeasResult>("/gemini/content-ideas", params),
};

// ── Active Provider ────────────────────────────────────────────────────────
// Swap this export to openaiService when OpenAI is connected.
// All page components consume aiService — no page changes needed.

export const aiService = geminiService;
