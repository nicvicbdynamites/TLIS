---
name: Supabase vs local postgres split
description: DATABASE_URL and Supabase cloud are completely separate databases in this project. Critical for schema migrations and auth.
---

## The split

- **DATABASE_URL** → local postgres used only by the Express API server (Drizzle ORM). Tables created here (via psql) are NOT visible to the Supabase REST API.
- **SUPABASE_URL + SUPABASE_ANON_KEY** → Supabase cloud postgres. This is what the React frontend talks to via `@supabase/supabase-js`. Has zero custom tables as of the auth module build (all REST probes returned 404).

## Evidence

```
psql "$DATABASE_URL" -c "\d public.calendar_posts"  → "Did not find any relation"
curl "$SUPABASE_URL/rest/v1/calendar_posts?select=id&limit=1" → 404
```

The app works entirely on localStorage fallbacks. All Supabase saves return false / fail silently. This is by design until the user applies supabase-schema.sql in their Supabase SQL editor.

## Auth

Supabase Auth (auth.users) is managed by Supabase itself — it exists and is enabled. Email/password auth works immediately with the anon key. No custom tables required for signIn/signUp/signOut/resetPassword.

**Why:** `auth.persistSession: false` (the original config) caused sessions to not persist across page reloads. Changed to `persistSession: true` + `autoRefreshToken: true` + `detectSessionInUrl: true`.

**How to apply:** When any Supabase table work is needed, the SQL must be run in the Supabase dashboard SQL editor — psql against DATABASE_URL will NOT work.

## User profiles table

The `profiles` table DDL is in `supabase-schema.sql` with RLS policies and a `handle_new_user()` trigger that auto-creates a profile on auth signup. The trigger attaches to `auth.users` which only exists in Supabase, not in the local postgres.
