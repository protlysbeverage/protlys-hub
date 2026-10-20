create table if not exists public.device_tracking_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  platform text not null default 'android',
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.device_tracking_tokens enable row level security;

revoke all on table public.device_tracking_tokens from anon, authenticated;

create index if not exists device_tracking_tokens_user_id_idx
  on public.device_tracking_tokens(user_id);

create index if not exists device_tracking_tokens_active_idx
  on public.device_tracking_tokens(token_hash)
  where revoked_at is null;
