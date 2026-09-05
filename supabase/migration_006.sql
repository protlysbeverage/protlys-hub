-- ============================================================
-- PROTLYS HUB — MIGRATION 006
-- Feed post editing
-- ============================================================

alter table public.feed_posts enable row level security;

drop policy if exists "fp: owner update" on public.feed_posts;
create policy "fp: owner update"
on public.feed_posts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
