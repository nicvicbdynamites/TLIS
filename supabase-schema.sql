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

-- ──────────────────────────────────────────────
--  TABLE: vault_collections
--  User-created folders for organising vault entries
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_collections (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT 'gold'
                          CHECK (color IN ('gold','amber','rose','indigo','emerald','slate')),
  icon        TEXT        NOT NULL DEFAULT 'folder',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
--  UPGRADE: add missing columns to vault_entries if upgrading from an older schema
-- ──────────────────────────────────────────────
ALTER TABLE public.vault_entries
  ADD COLUMN IF NOT EXISTS prompt           TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_template  TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS platform         TEXT        NOT NULL DEFAULT 'TikTok',
  ADD COLUMN IF NOT EXISTS source           TEXT        NOT NULL DEFAULT 'generator',
  ADD COLUMN IF NOT EXISTS model            TEXT        NOT NULL DEFAULT 'gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_score         SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viral_potential  SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_favourite     BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags             TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS collection_id    TEXT,
  ADD COLUMN IF NOT EXISTS views            INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_keywords  TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS embedding_ready  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS campaign_id      TEXT,
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_accessed    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ──────────────────────────────────────────────
--  TABLE: vault_entries
--  Permanently saved AI-generated content with full metadata,
--  AI scoring, semantic search preparation, and team-ready structure.
--
--  Vector-DB readiness:
--    The search_keywords TEXT[] column seeds keyword extraction.
--    When pgvector is available, add:
--      embedding VECTOR(1536)
--    and populate it with OpenAI ada-002 embeddings of the content field.
--    Then replace keyword search with: ORDER BY embedding <=> query_embedding
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id               TEXT          PRIMARY KEY,
  device_id        TEXT          NOT NULL DEFAULT '',
  user_id          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Content
  title            TEXT          NOT NULL DEFAULT '',
  content          TEXT          NOT NULL DEFAULT '',
  prompt           TEXT          NOT NULL DEFAULT '',
  prompt_template  TEXT          NOT NULL DEFAULT '',

  -- Classification
  type             TEXT          NOT NULL DEFAULT 'other'
                                 CHECK (type IN ('hook','caption','script','idea','hashtags','thread','bio','ad','other')),
  niche            TEXT          NOT NULL DEFAULT '',
  platform         TEXT          NOT NULL DEFAULT 'TikTok',
  tone             TEXT          NOT NULL DEFAULT '',

  -- AI metadata
  source           TEXT          NOT NULL DEFAULT 'generator'
                                 CHECK (source IN ('generator','manual','import')),
  model            TEXT          NOT NULL DEFAULT 'gpt-4o-mini',

  -- Scoring
  ai_score         SMALLINT      NOT NULL DEFAULT 0 CHECK (ai_score BETWEEN 0 AND 100),
  viral_potential  SMALLINT      NOT NULL DEFAULT 0 CHECK (viral_potential BETWEEN 0 AND 100),

  -- User interaction
  is_favourite     BOOLEAN       NOT NULL DEFAULT FALSE,
  tags             TEXT[]        NOT NULL DEFAULT '{}',
  collection_id    TEXT          REFERENCES public.vault_collections(id) ON DELETE SET NULL,
  views            INTEGER       NOT NULL DEFAULT 0,

  -- Semantic search preparation (vector-DB-ready)
  search_keywords  TEXT[]        NOT NULL DEFAULT '{}',
  embedding_ready  BOOLEAN       NOT NULL DEFAULT FALSE,
  -- Future: embedding VECTOR(1536),  -- add when pgvector is enabled

  -- Campaign / team structure
  campaign_id      TEXT,
  -- Future: team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,

  -- Timestamps
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_accessed    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
--  ROW LEVEL SECURITY — vault tables
-- ──────────────────────────────────────────────

ALTER TABLE public.vault_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_entries      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pre_auth_all" ON public.vault_collections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "pre_auth_all" ON public.vault_entries
  FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────
--  INDEXES — vault tables
-- ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vault_collections_device_id
  ON public.vault_collections(device_id);

CREATE INDEX IF NOT EXISTS idx_vault_entries_device_id
  ON public.vault_entries(device_id);

CREATE INDEX IF NOT EXISTS idx_vault_entries_created_at
  ON public.vault_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vault_entries_is_favourite
  ON public.vault_entries(device_id, is_favourite) WHERE is_favourite = TRUE;

CREATE INDEX IF NOT EXISTS idx_vault_entries_ai_score
  ON public.vault_entries(ai_score DESC);

CREATE INDEX IF NOT EXISTS idx_vault_entries_type
  ON public.vault_entries(device_id, type);

CREATE INDEX IF NOT EXISTS idx_vault_entries_collection
  ON public.vault_entries(collection_id) WHERE collection_id IS NOT NULL;

-- GIN index for fast array search on tags and keywords
CREATE INDEX IF NOT EXISTS idx_vault_entries_tags
  ON public.vault_entries USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_vault_entries_search_keywords
  ON public.vault_entries USING GIN (search_keywords);

-- ──────────────────────────────────────────────
--  UPDATED_AT TRIGGER — vault_entries
-- ──────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_vault_entries_updated_at ON public.vault_entries;
CREATE TRIGGER set_vault_entries_updated_at
  BEFORE UPDATE ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────
--  TABLE: content_packs  (Module 11)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_packs (
  id                  TEXT        PRIMARY KEY,
  device_id           TEXT        NOT NULL DEFAULT '',
  niche               TEXT        NOT NULL DEFAULT '',
  style               TEXT        NOT NULL DEFAULT '',
  tone                TEXT        NOT NULL DEFAULT '',
  platform            TEXT        NOT NULL DEFAULT 'TikTok',
  audience            TEXT        NOT NULL DEFAULT '',
  hook                TEXT        NOT NULL DEFAULT '',
  caption             TEXT        NOT NULL DEFAULT '',
  video_prompt        TEXT        NOT NULL DEFAULT '',
  hashtags            TEXT[]      NOT NULL DEFAULT '{}',
  cta                 TEXT        NOT NULL DEFAULT '',
  best_posting_time   TEXT        NOT NULL DEFAULT '',
  model               TEXT        NOT NULL DEFAULT 'gemini-2.5-flash',
  is_favourite        BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_packs_device_id_idx  ON public.content_packs(device_id);
CREATE INDEX IF NOT EXISTS content_packs_created_at_idx ON public.content_packs(created_at DESC);

ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pre_auth_all" ON public.content_packs
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_content_packs_updated_at ON public.content_packs;
CREATE TRIGGER set_content_packs_updated_at
  BEFORE UPDATE ON public.content_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────
--  UPGRADE PATH: vault_entries auth policies
-- ──────────────────────────────────────────────
-- DROP POLICY "pre_auth_all" ON public.vault_collections;
-- DROP POLICY "pre_auth_all" ON public.vault_entries;
--
-- CREATE POLICY "users_own_vault_collections" ON public.vault_collections
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "users_own_vault_entries" ON public.vault_entries
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- FUTURE: team_member_access policy for collaboration:
-- CREATE POLICY "team_vault_access" ON public.vault_entries
--   FOR SELECT USING (
--     team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
--   );
