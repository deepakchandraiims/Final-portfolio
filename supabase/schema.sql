-- ============================================================
-- Deepak Portfolio — Supabase schema
-- Run once in Supabase → SQL editor. Service-role key is used
-- server-side only (never exposed to the browser).
-- ============================================================

-- Whole-site content (single row, JSON blob)
create table if not exists public.site_content (
  id          text primary key,
  content     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Contact / recruiter enquiries
create table if not exists public.contact_requests (
  id            text primary key,
  name          text default '',
  email         text not null,
  company       text default '',
  role          text default '',
  message       text not null,
  recruiter_mode boolean default false,
  created_at    timestamptz not null default now()
);

-- File metadata (binaries live in Supabase Storage bucket,
-- OR source='google-drive' for linked Drive files with no local binary)
create table if not exists public.files (
  id            text primary key,
  original_name text,
  label         text,
  mime_type     text,
  size          bigint,
  category      text,
  storage_key   text,
  public_url    text,
  project_id    text,
  project_title text,
  source        text default 'upload',   -- 'upload' | 'google-drive'
  created_at    timestamptz not null default now()
);

create index if not exists files_project_idx on public.files (project_id);
create index if not exists contact_created_idx on public.contact_requests (created_at desc);

-- Visitor analytics (lightweight, first-party, no cookies/PII)
create table if not exists public.analytics_events (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null,
  path          text not null default '/',
  referrer      text,
  device        text,       -- 'mobile' | 'tablet' | 'desktop'
  browser       text,
  recruiter_mode boolean default false,
  created_at    timestamptz not null default now()
);

create index if not exists analytics_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_session_idx on public.analytics_events (session_id);

-- RLS: server uses the service-role key which bypasses RLS.
-- Enable RLS and add no public policies so the anon key can't touch these tables.
alter table public.site_content      enable row level security;
alter table public.contact_requests  enable row level security;
alter table public.files             enable row level security;
alter table public.analytics_events  enable row level security;

-- ============================================================
-- Migration (safe to re-run): if you already ran an earlier
-- version of this schema, this brings it up to date.
-- ============================================================
alter table public.files add column if not exists source text default 'upload';

create table if not exists public.analytics_events (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null,
  path          text not null default '/',
  referrer      text,
  device        text,
  browser       text,
  recruiter_mode boolean default false,
  created_at    timestamptz not null default now()
);
create index if not exists analytics_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_session_idx on public.analytics_events (session_id);
alter table public.analytics_events enable row level security;

-- ============================================================
-- Investment Lab
-- The Lab lives inside the same single `site_content` JSON blob
-- (content->'lab'), so no new table is required for CMS data.
-- These tables are only for time-series that would bloat the blob.
-- Safe to re-run.
-- ============================================================

-- Daily portfolio + benchmark valuation snapshots. Powers real Sharpe/beta/
-- drawdown instead of estimates. One row per day.
create table if not exists public.lab_valuations (
  id           bigserial primary key,
  as_of        date not null unique,
  total_value  numeric not null,
  invested     numeric,
  cash         numeric,
  benchmark    numeric,
  created_at   timestamptz not null default now()
);
create index if not exists lab_valuations_asof_idx on public.lab_valuations (as_of desc);

-- Cached provider quotes, so free-tier rate limits are never the bottleneck.
create table if not exists public.lab_quotes (
  symbol      text primary key,
  payload     jsonb not null,
  provider    text,
  fetched_at  timestamptz not null default now()
);

alter table public.lab_valuations enable row level security;
alter table public.lab_quotes     enable row level security;
