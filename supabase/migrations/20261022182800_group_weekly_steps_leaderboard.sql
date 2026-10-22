-- PROTLYS HUB — weekly group steps leaderboard
-- Group-only, Monday 00:00 through Sunday 23:59 in Africa/Nairobi.
-- Tie-break: member whose recorded weekly total was last updated first wins the tie.
-- daily_steps remains owner-readable; the security-definer RPC exposes only
-- the leaderboard fields to authenticated members of the selected group.

create index if not exists idx_daily_steps_user_date_steps
  on public.daily_steps(user_id, step_date, steps);

create index if not exists idx_group_members_group_user
  on public.group_members(group_id, user_id);

create or replace function public.get_group_weekly_steps(p_group_id uuid)
returns table(
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  group_name text,
  weekly_steps bigint,
  steps_today bigint,
  movement_days integer,
  current_streak integer,
  reached_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_week_start date := date_trunc('week', (now() at time zone 'Africa/Nairobi'))::date;
  v_week_end date := v_week_start + 7;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_group_id is null then
    raise exception 'Group is required';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = v_uid
  ) then
    raise exception 'You are not a member of this group';
  end if;

  return query
  with eligible as (
    select
      p.id,
      coalesce(nullif(btrim(p.display_name), ''), 'Member')::text as username,
      p.avatar_url,
      g.name::text as group_name,
      coalesce(sum(ds.steps), 0)::bigint as weekly_steps,
      coalesce(
        max(ds.steps) filter (
          where ds.step_date = (now() at time zone 'Africa/Nairobi')::date
        ), 0
      )::bigint as steps_today,
      count(*) filter (where ds.steps > 0)::integer as movement_days,
      coalesce(p.step_streak, 0)::integer as current_streak,
      max(ds.synced_at) as reached_at
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    join public.profiles p on p.id = gm.user_id
    left join public.daily_steps ds
      on ds.user_id = p.id
     and ds.step_date >= v_week_start
     and ds.step_date < v_week_end
    where gm.group_id = p_group_id
    group by p.id, p.display_name, p.avatar_url, g.name, p.step_streak
  ),
  ranked as (
    select
      row_number() over (
        order by weekly_steps desc,
                 reached_at asc nulls last,
                 id asc
      )::bigint as rank,
      *
    from eligible
  )
  select
    r.rank,
    r.id,
    r.username,
    r.avatar_url,
    r.group_name,
    r.weekly_steps,
    r.steps_today,
    r.movement_days,
    r.current_streak,
    r.reached_at
  from ranked r
  order by r.rank;
end;
$$;

revoke all on function public.get_group_weekly_steps(uuid) from public, anon;
grant execute on function public.get_group_weekly_steps(uuid) to authenticated;

comment on function public.get_group_weekly_steps(uuid) is
'Returns the current Monday-Sunday Africa/Nairobi weekly steps leaderboard for a group. Access is limited to members of the requested group; it intentionally bypasses profile/daily_steps row visibility only inside this aggregate RPC.';
