---
name: Supabase RLS user_id pattern
description: All TLIS Supabase write payloads must include user_id or RLS rejects the INSERT when the user is authenticated.
---

## Rule
Every Supabase INSERT/UPSERT in `supabase.ts` must include `user_id: await getAuthUserId()` (or pass userId via the row mapper). Omitting it means user_id = NULL, and the policy `WITH CHECK (auth.uid() = user_id)` rejects it for authenticated users.

**Why:** RLS policy `auth_own_content_packs` (and identical policies on all five tables) requires `user_id = auth.uid()` for the `authenticated` role. NULL ≠ auth.uid() → 403.

**How to apply:**
- Call `const userId = await getAuthUserId()` at the top of every write function before the upsert.
- Pass userId into every row-mapper function that builds the payload.
- For new tables: add the same policy pattern + ensure the row mapper accepts and emits user_id.

## Auth-aware fetch pattern
```typescript
const userId = await getAuthUserId();
let q = supabase.from("table").select("*");
if (!userId) q = q.eq("device_id", getDeviceId()); // anon: device-scoped
// authenticated: RLS auto-filters to user_id = auth.uid() — no explicit filter needed
const { data, error } = await q;
```
This gives cross-device data access when logged in.

## Tables affected
calendar_posts, ai_generations, saved_outputs, vault_entries, vault_collections, content_packs

## Helper function
`getAuthUserId()` in supabase.ts reads `supabase.auth.getSession()` — this uses the cached localStorage session, no network call.
