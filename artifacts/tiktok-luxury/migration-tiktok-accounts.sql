-- Module 14: TikTok Account Manager
-- Run this in your Supabase SQL Editor (dashboard.supabase.com → SQL Editor)

create table if not exists public.tiktok_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid references public.tiktok_workspaces(id) on delete set null,
  account_name  text not null default '',
  username      text not null default '',
  email         text not null default '',
  phone         text not null default '',
  country       text not null default '',
  timezone      text not null default '',
  language      text not null default '',
  status        text not null default 'active'
                  check (status in ('active','inactive','suspended','pending')),
  notes         text not null default '',
  has_password  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Row-Level Security: each user sees only their own accounts
alter table public.tiktok_accounts enable row level security;

drop policy if exists "Users manage own tiktok_accounts" on public.tiktok_accounts;
create policy "Users manage own tiktok_accounts"
  on public.tiktok_accounts
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index if not exists tiktok_accounts_user_id_idx
  on public.tiktok_accounts (user_id);

create index if not exists tiktok_accounts_workspace_id_idx
  on public.tiktok_accounts (workspace_id);

create index if not exists tiktok_accounts_status_idx
  on public.tiktok_accounts (status);
