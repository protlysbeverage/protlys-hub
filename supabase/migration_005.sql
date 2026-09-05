-- ============================================================
-- PROTLYS HUB — MIGRATION 005
-- Fix recursive challenge RLS policies + allow community profiles
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

-- Community member profiles must be readable by signed-in members.
-- Without this policy, the member/[id] page receives no profile row
-- under RLS and incorrectly renders a 404 for other members.
drop policy if exists "profiles: community read" on public.profiles;

create policy "profiles: community read"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null);
