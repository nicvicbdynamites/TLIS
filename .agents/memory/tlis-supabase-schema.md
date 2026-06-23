---
name: TLIS Supabase schema gaps
description: vault_entries missing timestamp columns; vault_collections table doesn't exist; fix is in supabase-schema.sql
---

## The rule
Before cloud sync works for the vault, the user must run `supabase-schema.sql` in their Supabase SQL editor. The file is at the workspace root.

## What's missing
- `vault_entries.created_at`, `updated_at`, `last_accessed` — columns exist in CREATE TABLE but were absent from the table that was created with an older schema
- `vault_collections` — table never created in the user's Supabase project

## Resilience fix already applied
`fetchVaultEntriesFromCloud` no longer uses `ORDER BY created_at` — it fetches then sorts client-side. This means vault reads don't crash even with the old schema.

## Why
The Supabase schema was authored before vault features were finalized. The CREATE TABLE statements are correct but the user's existing vault_entries table predates them.

## How to apply
When vault cloud sync is broken or vault_collections errors appear in browser console, direct the user to run `supabase-schema.sql` in the Supabase dashboard SQL editor.
