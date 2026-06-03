-- ============================================================
--  TLIS — TikTok Luxury Intelligence System
--  Supabase Schema  |  Run this in your Supabase SQL Editor
-- ============================================================

-- UUID extension (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
--  TABLE: calendar_posts
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_posts (
  id            TEXT        PRIMARY KEY,
  device_id     TEXT        NOT NULL DEFAULT '',
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL DEFAULT '',
  content       TEXT        NOT NULL DEFAULT '',
  type          TEXT        NOT NULL DEFAULT 'hook'
                            CHECK (type IN ('hook','caption','prompt','idea','custom')),
  platform      TEXT        NOT NULL DEFAULT 'TikTok',
  niche         TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','scheduled','posted','viral')),
  scheduled_day TEXT,
  scheduled_time TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
--  TABLE: ai_generations
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL
              CHECK (type IN ('hooks','captions','prompts','ideas')),
  niche       TEXT        NOT NULL DEFAULT '',
  tone        TEXT        NOT NULL DEFAULT '',
  cost        NUMERIC(10,6) NOT NULL DEFAULT 0.0004,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
--  TABLE: saved_outputs
--  For prompt vault, saved hooks, AI-generated content
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_outputs (
  id            TEXT        PRIMARY KEY,
  device_id     TEXT        NOT NULL DEFAULT '',
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL,
  niche         TEXT        DEFAULT '',
  platform      TEXT        DEFAULT '',
  content       TEXT        NOT NULL,
  tone          TEXT        DEFAULT '',
  is_favourite  BOOLEAN     NOT NULL DEFAULT FALSE,
  source        TEXT        NOT NULL DEFAULT 'generator',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
--  ROW LEVEL SECURITY
-- ──────────────────────────────────────────────

ALTER TABLE public.calendar_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_outputs    ENABLE ROW LEVEL SECURITY;

-- PRE-AUTH: allow all anonymous operations
-- When Supabase Auth is added, replace these with user-scoped policies:
--   DROP POLICY "pre_auth_all" ON public.<table>;
--   CREATE POLICY "users_own_data" ON public.<table>
--     FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "pre_auth_all" ON public.calendar_posts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "pre_auth_all" ON public.ai_generations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "pre_auth_all" ON public.saved_outputs
  FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────
--  INDEXES
-- ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_calendar_posts_device_id
  ON public.calendar_posts(device_id);

CREATE INDEX IF NOT EXISTS idx_calendar_posts_scheduled_day
  ON public.calendar_posts(scheduled_day);

CREATE INDEX IF NOT EXISTS idx_calendar_posts_status
  ON public.calendar_posts(status);

CREATE INDEX IF NOT EXISTS idx_ai_generations_device_id
  ON public.ai_generations(device_id);

CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at
  ON public.ai_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_outputs_device_id
  ON public.saved_outputs(device_id);

CREATE INDEX IF NOT EXISTS idx_saved_outputs_type
  ON public.saved_outputs(type);

-- ──────────────────────────────────────────────
--  UPDATED_AT TRIGGER (calendar_posts)
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_calendar_posts_updated_at ON public.calendar_posts;
CREATE TRIGGER set_calendar_posts_updated_at
  BEFORE UPDATE ON public.calendar_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────
--  UPGRADE PATH: When adding Supabase Auth
-- ──────────────────────────────────────────────
-- 1. Drop all pre_auth_all policies above
-- 2. Uncomment and run the user-scoped policies below
-- 3. Run a migration to set user_id = auth.uid() for existing rows
--    matched by device_id where the user registers with their device
--
-- CREATE POLICY "users_own_calendar" ON public.calendar_posts
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "users_own_generations" ON public.ai_generations
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "users_own_outputs" ON public.saved_outputs
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
