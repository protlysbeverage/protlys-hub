-- Align weekly movement and leaderboard windows to Sunday 00:00–Saturday 23:59 Africa/Nairobi.
-- Keep the in-app leaderboard and Android widget on the same week boundary.

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
  v_week date := ((now() at time zone 'Africa/Nairobi')::date-(extract(dow from (now() at time zone 'Africa/Nairobi'))::int));
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
    where gm.group_id=p_group_id
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id=v_uid and b.blocked_id=p.id
      )
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

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text, p_group_id uuid DEFAULT NULL::uuid, p_period text DEFAULT 'this_week'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(rank bigint, user_id uuid, username text, avatar_url text, steps bigint, last_week_rank bigint, steps_to_pass bigint, rival_username text, improvement numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=(select auth.uid()); v_city text; v_scope text:=lower(trim(coalesce(p_scope,'world'))); v_period text:=lower(trim(coalesce(p_period,'this_week'))); v_city_key text; v_limit integer:=least(greatest(coalesce(p_limit,50),1),1000); v_offset integer:=greatest(coalesce(p_offset,0),0); v_week date:=((now() at time zone 'Africa/Nairobi')::date-(extract(dow from (now() at time zone 'Africa/Nairobi'))::integer)); v_count_synced boolean;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
 if v_period not in ('this_week','last_week','most_improved') then raise exception 'Invalid leaderboard period'; end if;
 select p.city into v_city from public.profiles p where p.id=v_uid; v_city_key:=lower(btrim(v_city));
 if v_scope='city' and nullif(v_city_key,'') is null then return; end if;
 if v_scope='group' then if p_group_id is null then raise exception 'Group is required'; end if; if not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=v_uid) then raise exception 'You are not a member of this group'; end if; end if;
 select count_synced_only into v_count_synced from public.leaderboard_settings where id=true;
 return query
 with eligible as (
  select p.id,p.display_name,p.avatar_url,
   case when v_period='last_week' then coalesce(w.steps,0)::bigint else coalesce(sum(case when ds.step_date>=v_week and ds.step_date<v_week+7 and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced') then ds.steps else 0 end),0)::bigint end steps,
   coalesce(lw.rank,null)::bigint last_week_rank,coalesce(lw.steps,0)::bigint last_week_steps
  from public.profiles p
  left join public.daily_steps ds on ds.user_id=p.id
  left join public.weekly_results w on w.week_start=v_week-7 and w.user_id=p.id and w.scope=v_scope and w.scope_key=case when v_scope='world' then 'world' when v_scope='city' then v_city_key when v_scope='group' then p_group_id::text end and (v_scope<>'group' or w.group_id=p_group_id)
  left join public.weekly_results lw on lw.week_start=v_week-7 and lw.user_id=p.id and lw.scope=v_scope and lw.scope_key=case when v_scope='world' then 'world' when v_scope='city' then v_city_key when v_scope='group' then p_group_id::text end and (v_scope<>'group' or lw.group_id=p_group_id)
  where v_scope='world' or (v_scope='city' and lower(btrim(p.city))=v_city_key) or (v_scope='group' and exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p.id))
  group by p.id,p.display_name,p.avatar_url,w.steps,lw.rank,lw.steps
 ), scored as (
  select e.*,case when v_period='most_improved' and e.last_week_steps >= (select most_improved_min_previous_steps from public.leaderboard_settings where id=true) then round(((e.steps-e.last_week_steps)::numeric/nullif(e.last_week_steps,0))*100,2) else null end improvement from eligible e
 ), ranked as (
  select s.*,rank() over(order by case when v_period='most_improved' then s.improvement else s.steps end desc nulls last) r,
    lag(s.steps) over(order by case when v_period='most_improved' then s.improvement else s.steps end desc nulls last) ahead_steps,
    lag(coalesce(nullif(btrim(s.display_name),''),'Member')) over(order by case when v_period='most_improved' then s.improvement else s.steps end desc nulls last) ahead_name
  from scored s
 )
 select r.r,r.id,coalesce(nullif(btrim(r.display_name),''),'Member')::text,r.avatar_url,r.steps,r.last_week_rank,
   case when r.id=v_uid and r.ahead_steps is not null and r.ahead_steps>r.steps then r.ahead_steps-r.steps+1 else null end,
   case when r.id=v_uid and r.ahead_steps is not null and r.ahead_steps>r.steps then r.ahead_name else null end,
   r.improvement
 from ranked r order by r.r,lower(coalesce(r.display_name,'')),r.id limit v_limit offset v_offset;
end; $function$

CREATE OR REPLACE FUNCTION public.finalize_weekly_results(p_week_start date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_week date; v_end date; v_count_synced boolean;
begin
 v_week:=coalesce(p_week_start,((now() at time zone 'Africa/Nairobi')::date-(extract(dow from (now() at time zone 'Africa/Nairobi'))::integer))-7); v_end:=v_week+7;
 select count_synced_only into v_count_synced from public.leaderboard_settings where id=true;
 delete from public.weekly_results where week_start=v_week;
 insert into public.weekly_results(week_start,user_id,scope,scope_key,rank,steps)
 with base as (
  select p.id user_id,coalesce(sum(ds.steps),0)::bigint steps,min(ds.synced_at) reached_at
  from public.profiles p left join public.daily_steps ds on ds.user_id=p.id and ds.step_date>=v_week and ds.step_date<v_end and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced')
  group by p.id
), ranked as (
  select *,row_number() over(order by steps desc,reached_at asc nulls last,user_id asc) r from base
)
 select v_week,user_id,'world','world',r,steps from ranked;
 insert into public.weekly_results(week_start,user_id,scope,scope_key,rank,steps)
 with base as (
  select p.id user_id,lower(btrim(p.city)) scope_key,coalesce(sum(ds.steps),0)::bigint steps,min(ds.synced_at) reached_at
  from public.profiles p left join public.daily_steps ds on ds.user_id=p.id and ds.step_date>=v_week and ds.step_date<v_end and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced')
  where nullif(btrim(p.city),'') is not null group by p.id,lower(btrim(p.city))
), ranked as (
  select *,row_number() over(partition by scope_key order by steps desc,reached_at asc nulls last,user_id asc) r from base
)
 select v_week,user_id,'city',scope_key,r,steps from ranked;
 insert into public.weekly_results(week_start,user_id,scope,scope_key,group_id,rank,steps)
 with base as (
  select gm.group_id,gm.user_id,gm.group_id::text scope_key,coalesce(sum(ds.steps),0)::bigint steps,min(ds.synced_at) reached_at
  from public.group_members gm left join public.daily_steps ds on ds.user_id=gm.user_id and ds.step_date>=v_week and ds.step_date<v_end and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced')
  group by gm.group_id,gm.user_id
), ranked as (
  select *,row_number() over(partition by group_id order by steps desc,reached_at asc nulls last,user_id asc) r from base
)
 select v_week,user_id,'group',scope_key,group_id,r,steps from ranked;
end; $function$

create or replace function public.get_group_member_profile(p_user_id uuid,p_group_id uuid,p_local_date date,p_timezone text default 'Africa/Nairobi')
returns jsonb
language plpgsql stable security definer
set search_path to ''
as $function$
declare
 v_uid uuid:=(select auth.uid()); v_shared boolean; v_steps boolean; v_protein boolean; v_result jsonb; v_group uuid; v_rank bigint; v_week date; v_prev_total bigint; v_tz text:=coalesce(nullif(trim(p_timezone),''),'Africa/Nairobi');
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select exists(select 1 from public.group_members a join public.group_members b on b.group_id=a.group_id where a.user_id=v_uid and b.user_id=p_user_id) into v_shared;
 if not v_shared and v_uid<>p_user_id then raise exception 'Not a shared group member'; end if;
 select show_group_steps,show_group_protein into v_steps,v_protein from public.profiles where id=p_user_id;
 v_steps:=coalesce(v_steps,false) or v_uid=p_user_id; v_protein:=coalesce(v_protein,false) or v_uid=p_user_id;
 if p_group_id is not null and exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid) and exists(select 1 from public.group_members where group_id=p_group_id and user_id=p_user_id) then v_group:=p_group_id;
 else select a.group_id into v_group from public.group_members a join public.group_members b on b.group_id=a.group_id where a.user_id=v_uid and b.user_id=p_user_id order by (select count(*) from public.group_members x where x.group_id=a.group_id) desc,a.group_id limit 1;
 end if;
 v_week:=p_local_date-(extract(dow from p_local_date)::int);
 if v_steps then
   select l.rank into v_rank from public.get_group_leaderboard(v_group,'this_week',1000,0) l where l.user_id=p_user_id;
   select coalesce(sum(ds.steps),0)::bigint into v_prev_total from public.daily_steps ds where ds.user_id=p_user_id and ds.step_date between p_local_date-13 and p_local_date-7 and not coalesce(ds.is_flagged,false);
 end if;
 select jsonb_strip_nulls(jsonb_build_object(
  'id',p.id,'name',coalesce(nullif(trim(p.display_name),''),'Protlys member'),'avatar_url',p.avatar_url,'joined_at',p.created_at,
  'founding_member',exists(select 1 from public.group_members fm join public.groups fg on fg.id=fm.group_id where fm.user_id=p.id and fg.is_system and fg.name='Founding 250'),
  'streak',case when v_steps then greatest(coalesce(p.step_streak,p.streak,0),0) end,
  'steps_week',case when v_steps then (select coalesce(sum(ds.steps),0)::bigint from public.daily_steps ds where ds.user_id=p.id and ds.step_date between v_week and v_week+6 and not coalesce(ds.is_flagged,false)) end,
  'group_rank',case when v_steps then v_rank end,
  'steps_visible',v_steps,
  'last7',case when v_steps then (select jsonb_agg(jsonb_build_object('date',d::date,'steps',coalesce(ds.steps,0)) order by d) from generate_series(p_local_date-6,p_local_date,'1 day') d left join public.daily_steps ds on ds.user_id=p.id and ds.step_date=d::date and not coalesce(ds.is_flagged,false)) end,
  'previous7_total',case when v_steps then coalesce(v_prev_total,0) end,
  'protein_today',case when v_protein then (select coalesce(sum(pl.grams),0)::bigint from public.protein_logs pl where pl.user_id=p.id and pl.log_date=p_local_date) end,
  'protein_goal',case when v_protein then p.target_g end,
  'challenges_joined',(select count(*)::bigint from public.challenge_members cm join public.challenges c on c.id=cm.challenge_id where cm.user_id=p.id and p_local_date between c.start_date and c.end_date),
  'cheered_today',exists(select 1 from public.cheers ch where ch.from_user_id=v_uid and ch.to_user_id=p.id and (ch.created_at at time zone 'Africa/Nairobi')::date=p_local_date),
  'group_id',v_group
 )) into v_result from public.profiles p where p.id=p_user_id;
 return v_result;
end
$function$;

create or replace function public.get_member_stats(p_user_id uuid,p_scope text default 'world',p_group_id uuid default null)
returns table(username text,avatar_url text,rank bigint,steps_today bigint,estimated_distance_km numeric,weekly_wins bigint,best_week bigint,top_10_finishes bigint,climb_vs_last_week bigint,recent_activity jsonb,last_week_rank bigint)
language plpgsql stable security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_city text; v_target_city text;
  v_scope text := lower(trim(coalesce(p_scope,'world')));
  v_city_key text;
  v_week date := ((now() at time zone 'Africa/Nairobi')::date-(extract(dow from (now() at time zone 'Africa/Nairobi'))::integer));
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


-- Keep legacy group-profile overload and the weekly group card on the same Sunday boundary.

create or replace function public.get_group_member_profile(p_user_id uuid,p_group_id uuid,p_local_date date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid());v_shared boolean;v_steps boolean;v_protein boolean;v_result jsonb;v_group uuid;v_rank bigint;v_week date;
begin if v_uid is null then raise exception 'Authentication required';end if;select exists(select 1 from public.group_members a join public.group_members b on b.group_id=a.group_id where a.user_id=v_uid and b.user_id=p_user_id) into v_shared;if not v_shared and v_uid<>p_user_id then raise exception 'Not a shared group member';end if;select show_group_steps,show_group_protein into v_steps,v_protein from public.profiles where id=p_user_id;v_steps:=v_steps or v_uid=p_user_id;v_protein:=v_protein or v_uid=p_user_id;if p_group_id is not null and exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid) and exists(select 1 from public.group_members where group_id=p_group_id and user_id=p_user_id) then v_group:=p_group_id;else select a.group_id into v_group from public.group_members a join public.group_members b on b.group_id=a.group_id where a.user_id=v_uid and b.user_id=p_user_id order by(select count(*) from public.group_members x where x.group_id=a.group_id) desc,a.group_id limit 1;end if;v_week:=p_local_date-(extract(dow from p_local_date)::int);if v_steps then select l.rank into v_rank from public.get_group_leaderboard(v_group,'this_week',1000,0) l where l.user_id=p_user_id;end if;
select jsonb_strip_nulls(jsonb_build_object('id',p.id,'name',coalesce(nullif(trim(p.display_name),''),'Protlys member'),'avatar_url',p.avatar_url,'joined_at',p.created_at,'founding_member',exists(select 1 from public.group_members fm join public.groups fg on fg.id=fm.group_id where fm.user_id=p.id and fg.is_system and fg.name='Founding 250'),'streak',case when v_steps then greatest(coalesce(p.step_streak,p.streak,0),0) end,'steps_week',case when v_steps then(select coalesce(sum(ds.steps),0)::bigint from public.daily_steps ds where ds.user_id=p.id and ds.step_date between v_week and v_week+6 and not coalesce(ds.is_flagged,false))end,'group_rank',case when v_steps then v_rank end,'last7',case when v_steps then(select jsonb_agg(jsonb_build_object('date',d::date,'steps',coalesce(ds.steps,0))order by d)from generate_series(p_local_date-6,p_local_date,'1 day')d left join public.daily_steps ds on ds.user_id=p.id and ds.step_date=d::date)end,'protein_today',case when v_protein then(select coalesce(sum(pl.grams),0)::bigint from public.protein_logs pl where pl.user_id=p.id and pl.log_date=p_local_date)end,'protein_goal',case when v_protein then p.target_g end,'challenges_joined',(select count(*)::bigint from public.challenge_members cm join public.challenges c on c.id=cm.challenge_id where cm.user_id=p.id and p_local_date between c.start_date and c.end_date),'cheered_today',exists(select 1 from public.cheers ch where ch.from_user_id=v_uid and ch.to_user_id=p.id and(ch.created_at at time zone 'Africa/Nairobi')::date=p_local_date),'group_id',v_group))into v_result from public.profiles p where p.id=p_user_id;return v_result;end;$$;

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
  v_week_start date := ((now() at time zone 'Africa/Nairobi')::date - extract(dow from (now() at time zone 'Africa/Nairobi'))::int);
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

-- Service-role-only overload used by the native widget. It delegates ranking to the
-- same authenticated RPC used by the app, then returns the top N plus the viewer.
create or replace function public.get_group_leaderboard(
  p_group_id uuid,
  p_period text,
  p_limit integer,
  p_offset integer,
  p_user_id uuid
)
returns table(
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  steps bigint,
  last_week_rank bigint,
  steps_to_pass bigint,
  rival_username text,
  improvement numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 3), 1), 1000);
begin
  if p_user_id is null then
    raise exception 'Viewer is required';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_user_id::text, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  return query
    select ranked.*
    from public.get_group_leaderboard(p_group_id, p_period, 1000, 0) ranked
    where ranked.rank <= v_limit or ranked.user_id = p_user_id
    order by ranked.rank;
end;
$function$;

revoke all on function public.get_group_leaderboard(uuid,text,integer,integer,uuid) from public, anon, authenticated;
grant execute on function public.get_group_leaderboard(uuid,text,integer,integer,uuid) to service_role;

comment on function public.get_group_leaderboard(uuid,text,integer,integer,uuid) is
'Service-role-only widget overload. Uses the same group ranking RPC as the app and returns top N plus the specified authenticated viewer row.';

comment on function public.get_group_weekly_steps(uuid) is 'Returns the current Sunday-Saturday Africa/Nairobi weekly steps leaderboard for a group.';


-- Rebuild the most recently completed Sunday-Saturday period for last-week views.
select public.finalize_weekly_results(
  (now() at time zone 'Africa/Nairobi')::date
  - extract(dow from (now() at time zone 'Africa/Nairobi'))::integer
  - 7
);
