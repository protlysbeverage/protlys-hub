-- ============================================================
-- PROTLYS HUB — MIGRATION 005
-- Fix recursive challenge RLS policies
-- ============================================================

create schema if not exists private;

create or replace function private.user_challenge_ids()
returns setof bigint
language sql
security definer
set search_path = ''
stable
as $$
  select challenge_id
  from public.challenge_members
  where user_id = (select auth.uid())
$$;

create or replace function private.user_created_challenge_ids()
returns setof bigint
language sql
security definer
set search_path = ''
stable
as $$
  select id
  from public.challenges
  where creator_id = (select auth.uid())
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.user_challenge_ids() to authenticated;
grant execute on function private.user_created_challenge_ids() to authenticated;

drop policy if exists "challenges: read" on public.challenges;
drop policy if exists "cm: read" on public.challenge_members;

create policy "challenges: read"
on public.challenges
for select
to authenticated
using (
  visibility in ('public', 'invite')
  or creator_id = (select auth.uid())
  or id in (select private.user_challenge_ids())
);

create policy "cm: read"
on public.challenge_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or challenge_id in (select private.user_created_challenge_ids())
);

create policy "cm: insert"
on public.challenge_members
for insert
to authenticated
with check (user_id = (select auth.uid()));
