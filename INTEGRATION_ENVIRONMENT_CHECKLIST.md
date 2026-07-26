# Production integration environment checklist

## Required for local development
- Supabase URL and anon key for the React app and auth flows
- Local PostgreSQL connection string for the API server database layer
- A Gemini API key for AI generation routes

## Provider readiness by service

### Gemini
- Required env var: GEMINI_API_KEY
- Status: Live generation is enabled when configured; otherwise the service returns a graceful error response.

### Ahrefs
- Required env var: AHREFS_API_KEY
- Optional: AHREFS_TARGET
- Status: Falls back to rich static intelligence when missing.

### Google Search Console
- Required env vars: GSC_SITE_URL, GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN
- Status: Falls back to static analytics when any value is missing.

### Reddit
- No credentials required for the current read-only implementation.
- Optional: REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET if you later expand to authenticated endpoints.
- Status: Falls back gracefully when the public API is unavailable.

### Supabase
- Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY
- Optional: SUPABASE_SERVICE_ROLE_KEY for server-side admin actions
- Status: Frontend auth and persistence depend on these values.

## Deployment notes
- Keep secrets in deployment secret storage rather than committed files.
- The API server and frontend can start without optional providers configured.
- Existing graceful fallback behavior should remain unchanged.
