-- ============================================================
-- PROTLYS HUB — SUPABASE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. PROFILES — one row per member (extends Supabase auth users)
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  points        integer not null default 0,
  streak        integer not null default 0,
  last_log_date date,
  target_g      integer not null default 120,
  created_at    timestamptz not null default now()
);

-- 2. PROTEIN LOGS — one row per serving logged
create table if not exists protein_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references profiles(id) on delete cascade,
  product_id     text,
  product_label  text,
  grams          integer not null default 0,
  log_date       date not null default current_date,
  logged_at      timestamptz not null default now()
);

-- 3. MILESTONES — unlock record (which badges/milestones a member has earned)
create table if not exists milestones (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  milestone   text not null,
  earned_at   timestamptz not null default now(),
  unique(user_id, milestone)
);

-- ============================================================
-- ROW LEVEL SECURITY — each member can only read/write their own data
-- ============================================================
alter table profiles     enable row level security;
alter table protein_logs enable row level security;
alter table milestones   enable row level security;

-- Profiles: owner access only
create policy "profiles: owner read"   on profiles for select using (auth.uid() = id);
create policy "profiles: owner insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles: owner update" on profiles for update using (auth.uid() = id);

-- Protein logs: owner access only
create policy "logs: owner read"   on protein_logs for select using (auth.uid() = user_id);
create policy "logs: owner insert" on protein_logs for insert with check (auth.uid() = user_id);

-- Milestones: owner read, server insert (via service role)
create policy "milestones: owner read" on milestones for select using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE — when a new user signs up, create their profile row
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Attach the trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INDEXES — for common queries
-- ============================================================
create index if not exists idx_protein_logs_user_date on protein_logs(user_id, log_date desc);
create index if not exists idx_milestones_user on milestones(user_id);
