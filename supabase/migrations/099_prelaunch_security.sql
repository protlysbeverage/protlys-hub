create table if not exists public.prot_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);

alter table public.prot_rate_limits enable row level security;
revoke all on public.prot_rate_limits from public, anon, authenticated;

create or replace function public.consume_prot_rate_limit(
  p_limit integer default 20,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
begin
  if v_uid is null then
    return false;
  end if;

  insert into public.prot_rate_limits (user_id, window_started_at, request_count)
  values (v_uid, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when public.prot_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else public.prot_rate_limits.window_started_at
    end,
    request_count = case
      when public.prot_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else public.prot_rate_limits.request_count + 1
    end
  returning request_count <= p_limit into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_prot_rate_limit(integer, integer) from public, anon;
grant execute on function public.consume_prot_rate_limit(integer, integer) to authenticated;

create or replace function public.delete_my_protlys_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, storage
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Storage objects are not guaranteed to be owned by an auth FK, so remove them explicitly.
  delete from storage.objects where owner_id = v_uid::text or name like ('%/' || v_uid::text || '/%');

  -- Hub tables reference auth.users with ON DELETE CASCADE; deleting the auth row
  -- removes the account and associated application rows atomically.
  delete from auth.users where id = v_uid;

  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;

revoke all on function public.delete_my_protlys_account() from public, anon;
grant execute on function public.delete_my_protlys_account() to authenticated;
