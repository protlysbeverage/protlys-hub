-- Allow detail sheets to resolve members beyond the first 100 leaderboard rows.
create or replace function public.get_member_stats(p_user_id uuid,p_scope text default 'world',p_group_id uuid default null)
returns table(username text,avatar_url text,rank bigint,steps_today bigint,estimated_distance_km numeric,weekly_wins bigint,best_week bigint,top_10_finishes bigint,climb_vs_last_week bigint,recent_activity jsonb,last_week_rank bigint)
language plpgsql stable security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_city text; v_target_city text;
  v_scope text := lower(trim(coalesce(p_scope,'world')));
  v_city_key text;
  v_week date := ((now() at time zone 'Africa/Nairobi')::date-(extract(isodow from (now() at time zone 'Africa/Nairobi'))::integer-1));
  v_scope_key text; v_rank bigint; v_last_rank bigint;
  v_weekly_wins bigint; v_best_week bigint; v_top10 bigint;
  v_current_week_steps bigint; v_steps_today bigint; v_activity jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_user_id is null then raise exception 'Member is required'; end if;
  if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
  select city into v_city from public.profiles where id=v_uid;
  select city into v_target_city from public.profiles where id=p_user_id;
  v_city_key:=lower(btrim(v_city));
  if v_scope='city' and (nullif(v_city_key,'') is null or nullif(lower(btrim(v_target_city)),'') is null or v_city_key<>lower(btrim(v_target_city))) then raise exception 'Member is outside this city leaderboard'; end if;
  if v_scope='group' then
    if p_group_id is null then raise exception 'Group is required'; end if;
    if not exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid)
       or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=p_user_id) then raise exception 'Member is outside this group leaderboard'; end if;
  end if;
  v_scope_key:=case when v_scope='world' then 'world' when v_scope='city' then lower(btrim(v_target_city)) else p_group_id::text end;
  select rank into v_rank from public.get_leaderboard(v_scope,p_group_id,'this_week',1000,0) where user_id=p_user_id limit 1;
  select rank into v_last_rank from public.weekly_results where week_start=v_week-7 and user_id=p_user_id and scope=v_scope and scope_key=v_scope_key and(v_scope<>'group' or group_id=p_group_id) limit 1;
  select count(*) filter(where rank=1),coalesce(max(steps),0),count(*) filter(where rank<=10)
    into v_weekly_wins,v_best_week,v_top10
    from public.weekly_results
    where user_id=p_user_id and scope=v_scope and scope_key=v_scope_key and(v_scope<>'group' or group_id=p_group_id);
  select coalesce(sum(ds.steps),0) into v_current_week_steps
    from public.daily_steps ds
    where ds.user_id=p_user_id and ds.step_date>=v_week and ds.step_date<v_week+7 and not ds.is_flagged
      and(not(select count_synced_only from public.leaderboard_settings where id=true) or lower(ds.source)='synced');
  select coalesce(steps,0) into v_steps_today from public.daily_steps
    where user_id=p_user_id and step_date=(now() at time zone 'Africa/Nairobi')::date;
  select jsonb_agg(jsonb_build_object('day',gs::date,'steps',coalesce(ds.steps,0)) order by gs::date)
    into v_activity
    from generate_series(v_week,v_week+6,interval '1 day') gs
    left join public.daily_steps ds on ds.user_id=p_user_id and ds.step_date=gs::date;
  return query
    select coalesce(nullif(btrim(p.display_name),''),'Member')::text,p.avatar_url,v_rank,v_steps_today,
      round(v_current_week_steps::numeric*0.00075,1),coalesce(v_weekly_wins,0),coalesce(v_best_week,0),
      coalesce(v_top10,0),case when v_last_rank is null or v_rank is null then null else v_last_rank-v_rank end,
      v_activity,v_last_rank
    from public.profiles p where p.id=p_user_id;
end;
$$;
revoke all on function public.get_member_stats(uuid,text,uuid) from public,anon;
grant execute on function public.get_member_stats(uuid,text,uuid) to authenticated;