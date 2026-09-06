-- PROTLYS HUB — MIGRATION 009
-- Harden challenge creation/joining policies after repeated create failures.

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

drop policy if exists "challenges: insert" on public.challenges;
create policy "challenges: insert"
on public.challenges
for insert
to authenticated
with check ((select auth.uid()) = creator_id);

drop policy if exists "challenges: update" on public.challenges;
create policy "challenges: update"
on public.challenges
for update
to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

drop policy if exists "cm: insert" on public.challenge_members;
create policy "cm: insert"
on public.challenge_members
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Keep the existing non-recursive read policies from migration 005.
-- These policies deliberately use security-definer helper functions.
