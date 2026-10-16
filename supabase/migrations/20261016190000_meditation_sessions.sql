create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  minutes integer not null check (minutes > 0),
  completed_at timestamptz not null default now()
);

alter table public.meditation_sessions enable row level security;

create policy "Users can read their own meditation sessions"
  on public.meditation_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own meditation sessions"
  on public.meditation_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.meditation_sessions to authenticated;
revoke all on public.meditation_sessions from anon;
