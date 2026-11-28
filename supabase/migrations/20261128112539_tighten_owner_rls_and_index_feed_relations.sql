drop policy if exists "steps: owner insert" on public.daily_steps;
create policy "steps: owner insert" on public.daily_steps for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fl: owner delete" on public.feed_likes;
create policy "fl: owner delete" on public.feed_likes for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "fl: owner insert" on public.feed_likes;
create policy "fl: owner insert" on public.feed_likes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fp: owner delete" on public.feed_posts;
create policy "fp: owner delete" on public.feed_posts for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "fp: owner insert" on public.feed_posts;
create policy "fp: owner insert" on public.feed_posts for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fp: owner update" on public.feed_posts;
create policy "fp: owner update" on public.feed_posts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "comments: owner delete" on public.post_comments;
create policy "comments: owner delete" on public.post_comments for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "comments: owner insert" on public.post_comments;
create policy "comments: owner insert" on public.post_comments for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: owner insert" on public.profiles;
create policy "profiles: owner insert" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles: owner read" on public.profiles;
create policy "profiles: owner read" on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "logs: owner insert" on public.protein_logs;
create policy "logs: owner insert" on public.protein_logs for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "logs: owner read" on public.protein_logs;
create policy "logs: owner read" on public.protein_logs for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_cheers_to_user_id on public.cheers(to_user_id);
create index if not exists idx_post_comments_post_id on public.post_comments(post_id);
