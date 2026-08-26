-- ============================================================
-- PROTLYS HUB — MIGRATION 002
-- Run AFTER the original schema.sql
-- All statements use IF NOT EXISTS / OR REPLACE — safe to re-run
-- ============================================================

-- ── 1. EXTEND PROFILES ──────────────────────────────────────
alter table profiles add column if not exists activity_level   text    not null default 'moderate';
alter table profiles add column if not exists step_goal        integer not null default 7500;
alter table profiles add column if not exists step_streak      integer not null default 0;
alter table profiles add column if not exists last_step_date   date;
alter table profiles add column if not exists total_steps      bigint  not null default 0;
alter table profiles add column if not exists share_activity   boolean not null default false;

-- ── 2. DAILY STEPS ──────────────────────────────────────────
create table if not exists daily_steps (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  step_date  date not null default current_date,
  steps      integer not null default 0,
  source     text not null default 'manual', -- 'manual' | 'healthkit' | 'healthconnect'
  synced_at  timestamptz not null default now(),
  unique(user_id, step_date)
);

-- ── 3. GOALS (smart milestones — step targets) ───────────────
create table if not exists goals (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  step_target integer not null,
  started_at  date not null default current_date,
  achieved_at date,
  is_current  boolean not null default true
);

-- ── 4. ACHIEVEMENTS (catalogue) ─────────────────────────────
create table if not exists achievements (
  id          bigint generated always as identity primary key,
  slug        text unique not null,
  name        text not null,
  description text not null,
  icon        text not null default '🏅',
  points      integer not null default 0,
  category    text not null default 'steps' -- 'steps'|'streak'|'challenge'|'community'|'protein'
);

-- ── 5. USER ACHIEVEMENTS ─────────────────────────────────────
create table if not exists user_achievements (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references profiles(id) on delete cascade,
  achievement_id bigint not null references achievements(id),
  earned_at      timestamptz not null default now(),
  unique(user_id, achievement_id)
);

-- ── 6. CHALLENGES ────────────────────────────────────────────
create table if not exists challenges (
  id           bigint generated always as identity primary key,
  creator_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  description  text,
  step_target  integer not null,
  start_date   date not null,
  end_date     date not null,
  visibility   text not null default 'public', -- 'public'|'private'|'invite'
  allow_teams  boolean not null default false,
  invite_token text unique default gen_random_uuid()::text,
  created_at   timestamptz not null default now()
);

-- ── 7. CHALLENGE MEMBERS ─────────────────────────────────────
create table if not exists challenge_members (
  id           bigint generated always as identity primary key,
  challenge_id bigint not null references challenges(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  team_name    text,
  joined_at    timestamptz not null default now(),
  unique(challenge_id, user_id)
);

-- ── 8. COMMUNITY POSTS ───────────────────────────────────────
create table if not exists community_posts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  body         text,
  image_url    text,
  post_type    text not null default 'post', -- 'post'|'milestone'|'challenge_result'
  ref_id       bigint,  -- achievement_id or challenge_id when post_type != 'post'
  created_at   timestamptz not null default now()
);

-- ── 9. POST LIKES ────────────────────────────────────────────
create table if not exists post_likes (
  id      bigint generated always as identity primary key,
  post_id bigint not null references community_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unique(post_id, user_id)
);

-- ── 10. POST COMMENTS ───────────────────────────────────────
create table if not exists post_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references community_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ── 11. NOTIFICATIONS ────────────────────────────────────────
create table if not exists notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null, -- 'achievement'|'challenge_invite'|'challenge_result'|'like'|'comment'
  title      text not null,
  body       text,
  ref_id     bigint,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── 12. USER POINTS LOG (expandable) ─────────────────────────
create table if not exists user_points (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  points     integer not null,
  reason     text not null, -- 'protein_log'|'step_milestone'|'challenge_win'|'streak'|'invite'|'community'
  ref_id     bigint,
  earned_at  timestamptz not null default now()
);

-- ── ACHIEVEMENT CATALOGUE ────────────────────────────────────
insert into achievements (slug, name, description, icon, points, category) values
  ('first_steps',     'First Steps',      'Log your first day of steps',              '👟', 10,  'steps'),
  ('steps_5k',        '5K Day',           'Walk 5,000 steps in a single day',         '🚶', 20,  'steps'),
  ('steps_10k',       '10K Day',          'Walk 10,000 steps in a single day',        '🏃', 50,  'steps'),
  ('steps_15k',       '15K Day',          'Walk 15,000 steps in a single day',        '⚡', 75,  'steps'),
  ('steps_50k_week',  '50K Week',         'Walk 50,000 steps in a single week',       '🔥', 100, 'steps'),
  ('steps_100k_week', '100K Week',        'Walk 100,000 steps in a single week',      '💪', 200, 'steps'),
  ('steps_1m',        '1 Million Steps',  'Walk 1,000,000 lifetime steps',            '🌟', 500, 'steps'),
  ('streak_3',        '3-Day Streak',     'Walk every day for 3 days',                '📅', 15,  'streak'),
  ('streak_7',        '7-Day Streak',     'Walk every day for 7 days',                '🗓️', 40, 'streak'),
  ('streak_30',       '30-Day Streak',    'Walk every day for 30 days',               '🏆', 150, 'streak'),
  ('challenge_first', 'First Challenge',  'Join your first challenge',                '🎯', 25,  'challenge'),
  ('challenge_win',   'Challenge Winner', 'Win a challenge',                          '🥇', 100, 'challenge'),
  ('invite_friend',   'Team Builder',     'Invite a friend who joins',                '🤝', 30,  'community'),
  ('protein_7day',    'Protein Streak',   'Log protein 7 days in a row',              '🥛', 40,  'protein')
on conflict (slug) do nothing;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table daily_steps        enable row level security;
alter table goals               enable row level security;
alter table achievements        enable row level security;
alter table user_achievements   enable row level security;
alter table challenges          enable row level security;
alter table challenge_members   enable row level security;
alter table community_posts     enable row level security;
alter table post_likes          enable row level security;
alter table post_comments       enable row level security;
alter table notifications       enable row level security;
alter table user_points         enable row level security;

-- daily_steps: owner only
create policy "steps: owner read"   on daily_steps for select using (auth.uid() = user_id);
create policy "steps: owner insert" on daily_steps for insert with check (auth.uid() = user_id);
create policy "steps: owner update" on daily_steps for update using (auth.uid() = user_id);

-- goals: owner only
create policy "goals: owner read"   on goals for select using (auth.uid() = user_id);
create policy "goals: owner insert" on goals for insert with check (auth.uid() = user_id);
create policy "goals: owner update" on goals for update using (auth.uid() = user_id);

-- achievements: public read (it's just a catalogue)
create policy "achievements: public read" on achievements for select using (true);

-- user_achievements: owner read
create policy "ua: owner read" on user_achievements for select using (auth.uid() = user_id);

-- challenges: public read if public, else member or creator
create policy "challenges: read" on challenges for select using (
  visibility = 'public' or creator_id = auth.uid() or
  exists (select 1 from challenge_members where challenge_id = challenges.id and user_id = auth.uid())
);
create policy "challenges: insert" on challenges for insert with check (auth.uid() = creator_id);
create policy "challenges: update" on challenges for update using (auth.uid() = creator_id);

-- challenge_members: member or challenge creator can read
create policy "cm: read" on challenge_members for select using (
  auth.uid() = user_id or
  exists (select 1 from challenges where id = challenge_id and creator_id = auth.uid())
);
create policy "cm: insert" on challenge_members for insert with check (auth.uid() = user_id);

-- community_posts: public read, owner insert
create policy "posts: public read"   on community_posts for select using (true);
create policy "posts: owner insert"  on community_posts for insert with check (auth.uid() = user_id);
create policy "posts: owner delete"  on community_posts for delete using (auth.uid() = user_id);

-- post_likes: public read, owner insert/delete
create policy "likes: public read"  on post_likes for select using (true);
create policy "likes: owner insert" on post_likes for insert with check (auth.uid() = user_id);
create policy "likes: owner delete" on post_likes for delete using (auth.uid() = user_id);

-- post_comments: public read, owner insert/delete
create policy "comments: public read"  on post_comments for select using (true);
create policy "comments: owner insert" on post_comments for insert with check (auth.uid() = user_id);
create policy "comments: owner delete" on post_comments for delete using (auth.uid() = user_id);

-- notifications: owner only
create policy "notifs: owner read"   on notifications for select using (auth.uid() = user_id);
create policy "notifs: owner update" on notifications for update using (auth.uid() = user_id);

-- user_points: owner read
create policy "points: owner read" on user_points for select using (auth.uid() = user_id);

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_daily_steps_user_date    on daily_steps(user_id, step_date desc);
create index if not exists idx_goals_user               on goals(user_id, is_current);
create index if not exists idx_ua_user                  on user_achievements(user_id);
create index if not exists idx_cm_challenge             on challenge_members(challenge_id);
create index if not exists idx_posts_created            on community_posts(created_at desc);
create index if not exists idx_notifs_user              on notifications(user_id, is_read);
create index if not exists idx_points_user              on user_points(user_id, earned_at desc);
