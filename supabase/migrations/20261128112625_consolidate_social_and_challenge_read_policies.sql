drop policy if exists "Users can follow members" on public.follows;
drop policy if exists "fo: owner insert" on public.follows;
create policy "follows: owner insert" on public.follows for insert to authenticated
with check ((select auth.uid()) = follower_id and follower_id <> following_id);

drop policy if exists "Users can unfollow members" on public.follows;
drop policy if exists "fo: owner delete" on public.follows;
create policy "follows: owner delete" on public.follows for delete to authenticated
using ((select auth.uid()) = follower_id);

drop policy if exists "Users can view follows" on public.follows;
drop policy if exists "fo: public read" on public.follows;
create policy "follows: public read" on public.follows for select to public using (true);

drop policy if exists "challenge_members: public challenge read" on public.challenge_members;
create policy "challenge_members: public challenge read" on public.challenge_members for select to anon
using (challenge_id in (select c.id from public.challenges c where c.visibility='public'));
