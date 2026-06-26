-- ============================================================
--  TLIS — Migration v2
--  Run this in Supabase → SQL Editor → New Query → Run All
--
--  Fixes two missing tables that failed to create during the
--  initial schema run:
--    1. profiles      (user auth mirror + subscription metadata)
--    2. content_packs (Module 11 — content pack generator)
--
--  Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
--  1. PROFILES
--  Mirror of auth.users with subscription metadata.
--  Auto-populated by trigger on every new sign-up.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    TEXT,
  full_name                TEXT,
  avatar_url               TEXT,
  plan                     TEXT        NOT NULL DEFAULT 'free'
                                       CHECK (plan IN ('free','pro','enterprise')),
  credits_used             INTEGER     NOT NULL DEFAULT 0,
  credits_limit            INTEGER     NOT NULL DEFAULT 100,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  subscription_status      TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent: DROP IF EXISTS first)
DROP POLICY IF EXISTS "Users can read own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile row on every new Supabase Auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Back-fill any existing auth users who signed up before this table existed
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
--  2. CONTENT_PACKS  (Module 11)
--  NOTE: The original schema omitted the user_id column from
--  the table definition while referencing it in RLS policies —
--  that caused both CREATE TABLE and CREATE POLICY to fail.
--  This migration creates it correctly.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.content_packs (
  id                TEXT        PRIMARY KEY,
  device_id         TEXT        NOT NULL DEFAULT '',
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- was missing
  niche             TEXT        NOT NULL DEFAULT '',
  style             TEXT        NOT NULL DEFAULT '',
  tone              TEXT        NOT NULL DEFAULT '',
  platform          TEXT        NOT NULL DEFAULT 'TikTok',
  audience          TEXT        NOT NULL DEFAULT '',
  hook              TEXT        NOT NULL DEFAULT '',
  caption           TEXT        NOT NULL DEFAULT '',
  video_prompt      TEXT        NOT NULL DEFAULT '',
  hashtags          TEXT[]      NOT NULL DEFAULT '{}',
  cta               TEXT        NOT NULL DEFAULT '',
  best_posting_time TEXT        NOT NULL DEFAULT '',
  model             TEXT        NOT NULL DEFAULT 'gemini-2.5-flash',
  is_favourite      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table somehow already existed without user_id, add it safely
ALTER TABLE public.content_packs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS content_packs_device_id_idx  ON public.content_packs(device_id);
CREATE INDEX IF NOT EXISTS content_packs_user_id_idx    ON public.content_packs(user_id);
CREATE INDEX IF NOT EXISTS content_packs_created_at_idx ON public.content_packs(created_at DESC);

ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_own_content_packs"  ON public.content_packs;
DROP POLICY IF EXISTS "anon_unowned_content_packs" ON public.content_packs;

CREATE POLICY "auth_own_content_packs" ON public.content_packs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anon_unowned_content_packs" ON public.content_packs
  FOR ALL TO anon
  USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

DROP TRIGGER IF EXISTS set_content_packs_updated_at ON public.content_packs;
CREATE TRIGGER set_content_packs_updated_at
  BEFORE UPDATE ON public.content_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ──────────────────────────────────────────────────────────────
--  3. VERIFY — run this block last to confirm all 7 tables exist
-- ──────────────────────────────────────────────────────────────

SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'content_packs',
    'vault_entries',
    'vault_collections',
    'calendar_posts',
    'ai_generations',
    'saved_outputs'
  )
ORDER BY tablename;
