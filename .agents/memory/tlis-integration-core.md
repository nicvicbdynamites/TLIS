---
name: TLIS Integration Core architecture
description: Centralized registry that all AI/research/social providers register through; how status reaches the UI and a scheduler staleness pitfall to avoid
---

# Integration Core (Phase 3A)

`artifacts/api-server/src/services/integration-core/` is a thin facade over existing
provider singletons (providerManager, google-trends/reddit/ahrefs/search-console,
secretsManager, scheduler) — it does not replace them, it wraps/observes them.

- New AI/research/social providers register an adapter here (`adapters/*.ts`) rather
  than being wired ad hoc into routes — this keeps `/api/integration-core/registry`
  a single source of truth for connection status across all provider categories.
- Frontend consumes it via a hand-written fetch client (`lib/integration-service.ts`,
  30s poll) mirroring the pre-existing `intelligence-service.ts` pattern — no Orval
  codegen was used for this phase (deliberate, to avoid OpenAPI backfill scope creep).
- Integration Hub page (`/integrations`) wires Overview/AI Providers/Background Jobs
  sections to this live data; Social Providers, Secrets, Integration Logs, and System
  Health Modules were deliberately left as mock data (lower-priority, deferred) —
  check before assuming the whole page is live.

## Scheduler warm-up staleness pitfall

Registry/status endpoints that derive "connected/health" state from scheduler tasks
will report stale "initializing" state for the task's full interval after boot if the
task only runs on its first `setInterval` tick (e.g. a 10-minute sync task means up to
10 minutes of wrong status after every restart).

**Why:** schedulers are typically registered with `setInterval(fn, intervalMs)` and no
immediate first call, so anything reading derived state before the first tick sees
placeholder/init values.

**How to apply:** when adding a new scheduled sync/health-check task whose result feeds
a status API, also fire a one-time `setTimeout` warm-up call shortly after boot (a few
seconds, staggered across tasks) so status reflects reality quickly after a restart —
see `integration-core/bootstrap.ts` for the pattern.
