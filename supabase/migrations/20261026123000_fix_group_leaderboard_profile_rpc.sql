-- Fix ambiguous user_id reference in the group leaderboard membership check.
-- This broke get_group_member_profile because its call into get_group_leaderboard
-- raised 42702 before returning profile data.

create or replace function public.get_group_leaderboard(p_group_id uuid, p_period text default 'this_week', p_limit integer default 50, p_offset integer default 0)
returns table(rank bigint, user_id uuid, username text, avatar_url text, steps bigint, last_week_rank bigint, steps_to_pass bigint, rival_username text, improvement numeric)
language plpgsql stable security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_period text := lower(trim(coalesce(p_period,'this_week')));
  v_limit int := least(greatest(coalesce(p_limit,50),1),1000);
  v_offset int := greatest(coalesce(p_offset,0),0);
  v_week date := ((now() at time zone 'Africa/Nairobi')::date-(extract(isodow from (now() at time zone 'Africa/Nairobi'))::int-1));
  v_count_synced boolean;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_group_id is null or not exists(
    select 1 from public.group_members gm_check
    where gm_check.group_id=p_group_id and gm_check.user_id=v_uid
  ) then raise exception 'You are not a member of this group'; end if;
  if v_period not in ('this_week','last_week','most_improved') then raise exception 'Invalid leaderboard period'; end if;
  select count_synced_only into v_count_synced from public.leaderboard_settings where id=true;
  return query
  with eligible as (
    select p.id,p.display_name,p.avatar_url,p.created_at profile_joined,gm.joined_at group_joined,
      coalesce(sum(case when ds.step_date>=v_week and ds.step_date<v_week+7 and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced') then ds.steps else 0 end),0)::bigint current_steps,
      min(case when ds.step_date>=v_week and ds.step_date<v_week+7 and ds.steps>0 then ds.synced_at end) current_reached_at,
      coalesce(lw.steps,0)::bigint last_steps, lw.rank::bigint last_rank,
      coalesce(lw.created_at,gm.joined_at,p.created_at) last_reached_at
    from public.group_members gm join public.profiles p on p.id=gm.user_id
    left join public.daily_steps ds on ds.user_id=p.id
    left join public.weekly_results lw on lw.week_start=v_week-7 and lw.user_id=p.id and lw.scope='group' and lw.group_id=p_group_id
    where gm.group_id=p_group_id
    group by p.id,p.display_name,p.avatar_url,p.created_at,gm.joined_at,lw.steps,lw.rank,lw.created_at
  ), scored as (
    select e.*,case when v_period='most_improved' and e.last_steps >= (select most_improved_min_previous_steps from public.leaderboard_settings where id=true)
      then round(((e.current_steps-e.last_steps)::numeric/nullif(e.last_steps,0))*100,2) end improvement
    from eligible e
  ), ordered as (
    select s.*,case when v_period='last_week' then s.last_steps else s.current_steps end display_steps,
      row_number() over(order by
        case when v_period='most_improved' then s.improvement end desc nulls last,
        case when v_period='last_week' then s.last_steps when v_period='this_week' then s.current_steps end desc nulls last,
        case when v_period='last_week' then s.last_reached_at else s.current_reached_at end asc nulls last,
        s.group_joined asc,s.id asc) r
    from scored s
  ), rivals as (
    select o.*,lag(o.display_steps) over(order by o.r) ahead_steps,lag(coalesce(nullif(btrim(o.display_name),''),'Member')) over(order by o.r) ahead_name from ordered o
  )
  select r.r,r.id,coalesce(nullif(btrim(r.display_name),''),'Member')::text,r.avatar_url,r.display_steps,r.last_rank,
    case when r.id=v_uid and r.ahead_steps is not null and r.ahead_steps>r.display_steps then r.ahead_steps-r.display_steps+1 end,
    case when r.id=v_uid and r.ahead_steps is not null and r.ahead_steps>r.display_steps then r.ahead_name end,
    r.improvement
  from rivals r order by r.r limit v_limit offset v_offset;
end
$function$;
