-- ============================================================
-- PROTLYS HUB — MIGRATION 003
-- Run after migration_002.sql
-- ============================================================

-- ── 1. FEED POSTS ────────────────────────────────────────────
create table if not exists feed_posts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text,
  image_url  text,
  post_type  text not null default 'general',
  stats      jsonb,                     -- { steps, distance, duration }
  created_at timestamptz not null default now()
);

-- ── 2. FEED LIKES ────────────────────────────────────────────
create table if not exists feed_likes (
  id      bigint generated always as identity primary key,
  post_id bigint not null references feed_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unique(post_id, user_id)
);

-- ── 3. FEED COMMENTS ─────────────────────────────────────────
create table if not exists feed_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references feed_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ── 4. EVENTS (admin-postable runs/marathons) ─────────────────
create table if not exists events (
  id           bigint generated always as identity primary key,
  created_by   uuid references profiles(id) on delete set null,
  title        text not null,
  description  text,
  location     text,
  event_date   date not null,
  event_time   text,
  link_url     text,
  image_url    text,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── 5. EVENT RSVPS ───────────────────────────────────────────
create table if not exists event_rsvps (
  id       bigint generated always as identity primary key,
  event_id bigint not null references events(id) on delete cascade,
  user_id  uuid not null references profiles(id) on delete cascade,
  unique(event_id, user_id)
);

-- ── 6. FOLLOWS (friends) ─────────────────────────────────────
create table if not exists follows (
  id          bigint generated always as identity primary key,
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(follower_id, following_id)
);

-- ── 7. ADD avatar_url to profiles ────────────────────────────
alter table profiles add column if not exists avatar_url text;

-- ── RLS ──────────────────────────────────────────────────────
alter table feed_posts    enable row level security;
alter table feed_likes    enable row level security;
alter table feed_comments enable row level security;
alter table events        enable row level security;
alter table event_rsvps   enable row level security;
alter table follows       enable row level security;

-- Feed posts: public read, owner insert/delete
create policy "fp: public read"   on feed_posts for select using (true);
create policy "fp: owner insert"  on feed_posts for insert with check (auth.uid() = user_id);
create policy "fp: owner delete"  on feed_posts for delete using (auth.uid() = user_id);

-- Feed likes: public read, owner insert/delete
create policy "fl: public read"   on feed_likes for select using (true);
create policy "fl: owner insert"  on feed_likes for insert with check (auth.uid() = user_id);
create policy "fl: owner delete"  on feed_likes for delete using (auth.uid() = user_id);

-- Feed comments: public read, owner insert/delete
create policy "fc: public read"   on feed_comments for select using (true);
create policy "fc: owner insert"  on feed_comments for insert with check (auth.uid() = user_id);
create policy "fc: owner delete"  on feed_comments for delete using (auth.uid() = user_id);

-- Events: public read (published only), authenticated insert
create policy "ev: public read"   on events for select using (is_published = true);
create policy "ev: auth insert"   on events for insert with check (auth.uid() is not null);
create policy "ev: owner update"  on events for update using (auth.uid() = created_by);

-- Event RSVPs: public read, owner insert/delete
create policy "er: public read"   on event_rsvps for select using (true);
create policy "er: owner insert"  on event_rsvps for insert with check (auth.uid() = user_id);
create policy "er: owner delete"  on event_rsvps for delete using (auth.uid() = user_id);

-- Follows: public read (for social features), owner insert/delete
create policy "fo: public read"   on follows for select using (true);
create policy "fo: owner insert"  on follows for insert with check (auth.uid() = follower_id);
create policy "fo: owner delete"  on follows for delete using (auth.uid() = follower_id);

-- ── STORAGE BUCKET ───────────────────────────────────────────
-- Run this in Supabase Dashboard > Storage > New bucket
-- OR run via SQL (requires pg_storage extension):
insert into storage.buckets (id, name, public)
values ('feed-images', 'feed-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "feed images: auth upload"
  on storage.objects for insert
  with check (bucket_id = 'feed-images' AND auth.role() = 'authenticated');

-- Allow public read
create policy "feed images: public read"
  on storage.objects for select
  using (bucket_id = 'feed-images');

-- Allow owners to delete their own
create policy "feed images: owner delete"
  on storage.objects for delete
  using (bucket_id = 'feed-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_feed_posts_created  on feed_posts(created_at desc);
create index if not exists idx_feed_likes_post     on feed_likes(post_id);
create index if not exists idx_feed_comments_post  on feed_comments(post_id);
create index if not exists idx_events_date         on events(event_date asc);
create index if not exists idx_follows_follower    on follows(follower_id);
create index if not exists idx_follows_following   on follows(following_id);
