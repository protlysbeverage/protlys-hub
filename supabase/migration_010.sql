-- PROTLYS HUB — MIGRATION 010
-- Remove challenge RLS recursion by making the two challenge policies
-- independent of each other, then recreate the intended access rules.

create schema if not exists private;

create or replace function private.user_challenge_ids()
returns setof bigint
language sql
security definer
set search_path = ''
stable
as $$
  select cm.challenge_id
  from public.challenge_members cm
  where cm.user_id = (select auth.uid())
$$;

create or replace function private.user_created_challenge_ids()
returns setof bigint
language sql
security definer
set search_path = ''
stable
as $$
  select c.id
  from public.challenges c
  where c.creator_id = (select auth.uid())
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.user_challenge_ids() to authenticated;
grant execute on function private.user_created_challenge_ids() to authenticated;

-- Remove every existing policy on both tables so an older recursive policy
-- cannot remain active alongside the corrected policies.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('challenges', 'challenge_members')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

-- Challenges: public/invite challenges are discoverable. Private challenges
-- remain visible to their creator or someone already enrolled in them.
create policy "challenges: read"
on public.challenges
for select
to authenticated
using (
  visibility in ('public', 'invite')
  or creator_id = (select auth.uid())
  or id in (select private.user_challenge_ids())
);

create policy "challenges: insert"
on public.challenges
for insert
to authenticated
with check ((select auth.uid()) = creator_id);

create policy "challenges: update"
on public.challenges
for update
to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

-- Membership reads do not call a function that reads challenge_members.
-- This avoids the policy-to-policy recursion that was causing the error.
create policy "challenge_members: read"
on public.challenge_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or challenge_id in (select private.user_created_challenge_ids())
);

create policy "challenge_members: insert"
on public.challenge_members
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Allow a member to leave a challenge, and a creator to manage membership.
create policy "challenge_members: delete"
on public.challenge_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or challenge_id in (select private.user_created_challenge_ids())
);
