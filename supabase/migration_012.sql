-- PROTLYS HUB — MIGRATION 012
-- Allow signed-in members to see who has joined public challenges.

create or replace function private.public_challenge_ids()
returns setof bigint
language sql
security definer
set search_path = ''
stable
as $$
  select id from public.challenges where visibility = 'public'
$$;

grant execute on function private.public_challenge_ids() to authenticated;

drop policy if exists "challenge_members: read" on public.challenge_members;
drop policy if exists "cm: read" on public.challenge_members;

create policy "challenge_members: read"
on public.challenge_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or challenge_id in (select private.user_created_challenge_ids())
  or challenge_id in (select private.public_challenge_ids())
);
