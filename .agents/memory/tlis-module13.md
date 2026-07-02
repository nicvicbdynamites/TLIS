---
name: TLIS Research Provider Architecture
description: How Google Trends (and future providers like Reddit, Ahrefs, SEMrush) are wired into the TLIS system
---

# Research Provider Architecture

## Pattern (all future providers must follow this)

1. **Server service** (`artifacts/api-server/src/services/<provider>.ts`):
   - Typed result interfaces (LuxurySummary, InterestPoint, etc.)
   - `FALLBACK_*` constants always available
   - In-memory cache class with TTL (~12 min)
   - `withTimeout()` wrapper (8s max per call)
   - High-level exported methods that never throw (always return data)
   - `format<Provider>Context(data)` → plain-text string for Gemini enrichment

2. **Server routes** (`artifacts/api-server/src/routes/<provider>.ts`):
   - Register via `routes/index.ts`
   - GET endpoints at `/api/<provider>/<resource>`
   - Always return 200 with data (fallback on error, not 5xx)
   - Log all requests and failures via `req.log`

3. **Frontend client** (`artifacts/tiktok-luxury/src/lib/<provider>-provider.ts`):
   - Mirrors server types
   - `<provider>Service` object with fetch methods
   - `use<Provider>Summary()` hook: `{ data, loading, error, refetch }`

4. **Gemini enrichment** (`routes/integrations.ts` research endpoint):
   - Before calling `generateResearch`, silently try to fetch trend context
   - If succeeds and source !== "fallback": pass `trendContext` string to `generateResearch`
   - Never block the Gemini call if trend fetch fails

## Google Trends specifics
- Package: `google-trends-api` (CJS, no types — use `// @ts-ignore`)
- `dailyTrends` can fail with rate limits; `interestOverTime` + `relatedQueries` more reliable
- When `dailyTrends` fails, `trendingSearches` falls back to static list; `source` still = "live" if other calls succeed
- Primary keyword for luxury niche: `"quiet luxury"`

**Why:** Google Trends doesn't have an official API; `google-trends-api` wraps the unofficial endpoint. Rate limits are real — robust fallback is critical.

## Pages updated
- Executive Brief (`/brief`): "LIVE TREND INTELLIGENCE" row after Daily Recommendation
- Niche Intelligence (`/niche`): Live "TREND SCORE" stat card + "LIVE MARKET SIGNALS" section
- Research Command Center (`/research`): Section 1 "Trending Niche" uses `topTrendingTopic`; Section 2 Google Trends card shows live badge/confidence/timestamp
