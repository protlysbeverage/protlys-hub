-- Supports the feed's deterministic created_at DESC, id DESC pagination order.
-- Existing idx_feed_posts_created covers created_at only; this composite index
-- avoids an additional sort when paginating equal timestamps.
create index if not exists idx_feed_posts_created_id
  on public.feed_posts (created_at desc, id desc);
