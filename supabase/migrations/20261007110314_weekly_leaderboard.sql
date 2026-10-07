-- Protlys Hub weekly leaderboard migration
create extension if not exists pg_cron;
create table if not exists public.leaderboard_settings (
 id boolean primary key default true check(id=true),
 count_synced_only boolean not null default false,
 max_single_entry_steps integer not null default 30000 check(max_single_entry_steps between 1 and 30000),
 max_daily_steps integer not null default 60000 check(max_daily_steps between 1 and 60000),
 most_improved_min_previous_steps integer not null default 2000 check(most_improved_min_previous_steps>=0),
 updated_at timestamptz not null default now()
);
insert into public.leaderboard_settings(id) values(true) on conflict(id) do nothing;
alter table public.daily_steps add column if not exists is_flagged boolean not null default false;
alter table public.daily_steps add column if not exists flag_reason text;
alter table public.daily_steps add constraint daily_steps_steps_cap check(steps between 0 and 60000);
create unique index if not exists daily_steps_user_date_unique on public.daily_steps(user_id,step_date);
create index if not exists idx_daily_steps_date_source on public.daily_steps(step_date,source) where is_flagged=false;
create table if not exists public.weekly_results (
 id bigint generated always as identity primary key, week_start date not null,
 user_id uuid not null references public.profiles(id) on delete cascade,
 scope text not null check(scope in('world','city','group')), scope_key text not null default '',
 group_id uuid references public.groups(id) on delete cascade, rank bigint not null check(rank>=1),
 steps bigint not null check(steps>=0), created_at timestamptz not null default now()
);
create unique index if not exists weekly_results_unique_scope on public.weekly_results(week_start,user_id,scope,scope_key);
create index if not exists weekly_results_lookup on public.weekly_results(scope,scope_key,week_start,rank);
alter table public.leaderboard_settings enable row level security;
alter table public.weekly_results enable row level security;
revoke all on public.leaderboard_settings from anon,authenticated;
revoke all on public.weekly_results from anon,authenticated;
CREATE OR REPLACE FUNCTION public.apply_daily_steps_delta(p_step_date date, p_delta integer, p_source text DEFAULT 'manual'::text, p_synced_at timestamp with time zone DEFAULT now())
 RETURNS daily_steps
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := (select auth.uid()); v_existing integer := 0; v_next integer; v_source text := lower(trim(coalesce(p_source,'manual'))); v_max_entry integer; v_max_day integer; v_row public.daily_steps;
begin
 if v_uid is null then raise exception 'Authentication required'; end if; if p_step_date is null then raise exception 'Step date is required'; end if; if p_delta is null or p_delta=0 then raise exception 'Step delta is required'; end if; if p_delta<0 then raise exception 'Negative step deltas are not allowed'; end if; if v_source not in ('manual','synced') then raise exception 'Invalid step source'; end if;
 select max_single_entry_steps,max_daily_steps into v_max_entry,v_max_day from public.leaderboard_settings where id=true;
 if p_delta>v_max_entry then raise exception 'Single step entry exceeds the configured limit'; end if;
 select steps into v_existing from public.daily_steps where user_id=v_uid and step_date=p_step_date for update;
 v_next:=coalesce(v_existing,0)+p_delta; if v_next>v_max_day then raise exception 'Daily steps exceed the configured limit'; end if;
 insert into public.daily_steps(user_id,step_date,steps,source,synced_at,is_flagged,flag_reason) values(v_uid,p_step_date,v_next,v_source,p_synced_at,false,null)
 on conflict(user_id,step_date) do update set steps=excluded.steps,source=excluded.source,synced_at=excluded.synced_at,is_flagged=false,flag_reason=null returning * into v_row;
 return v_row;
end; $function$


CREATE OR REPLACE FUNCTION public.finalize_weekly_results(p_week_start date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_week date; v_end date; v_count_synced boolean;
begin
 v_week:=coalesce(p_week_start,((now() at time zone 'Africa/Nairobi')::date-(extract(isodow from (now() at time zone 'Africa/Nairobi'))::integer-1))-7); v_end:=v_week+7;
 select count_synced_only into v_count_synced from public.leaderboard_settings where id=true;
 delete from public.weekly_results where week_start=v_week;
 insert into public.weekly_results(week_start,user_id,scope,scope_key,rank,steps)
 with base as (select p.id user_id,coalesce(sum(ds.steps),0)::bigint steps from public.profiles p left join public.daily_steps ds on ds.user_id=p.id and ds.step_date>=v_week and ds.step_date<v_end and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced') group by p.id), ranked as (select *,rank() over(order by steps desc) r from base)
 select v_week,user_id,'world','world',r,steps from ranked;
 insert into public.weekly_results(week_start,user_id,scope,scope_key,rank,steps)
 with base as (select p.id user_id,lower(btrim(p.city)) scope_key,coalesce(sum(ds.steps),0)::bigint steps from public.profiles p left join public.daily_steps ds on ds.user_id=p.id and ds.step_date>=v_week and ds.step_date<v_end and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced') where nullif(btrim(p.city),'') is not null group by p.id,lower(btrim(p.city))), ranked as (select *,rank() over(partition by scope_key order by steps desc) r from base)
 select v_week,user_id,'city',scope_key,r,steps from ranked;
 insert into public.weekly_results(week_start,user_id,scope,scope_key,group_id,rank,steps)
 with base as (select gm.group_id,gm.user_id,gm.group_id::text scope_key,coalesce(sum(ds.steps),0)::bigint steps from public.group_members gm left join public.daily_steps ds on ds.user_id=gm.user_id and ds.step_date>=v_week and ds.step_date<v_end and not ds.is_flagged and (not v_count_synced or lower(ds.source)='synced') group by gm.group_id,gm.user_id), ranked as (select *,rank() over(partition by group_id order by steps desc) r from base)
 select v_week,user_id,'group',scope_key,group_id,r,steps from ranked;
end; $function$


CREATE OR REPLACE FUNCTION public.get_hall_of_fame(p_scope text, p_group_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 12)
 RETURNS TABLE(week_start date, rank bigint, user_id uuid, username text, avatar_url text, steps bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=(select auth.uid()); v_city text; v_key text; v_scope text:=lower(trim(coalesce(p_scope,'world'))); v_limit integer:=least(greatest(coalesce(p_limit,12),1),52);
begin
 if v_uid is null then raise exception 'Authentication required'; end if; if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
 select city into v_city from public.profiles where id=v_uid; v_key:=case when v_scope='world' then 'world' when v_scope='city' then lower(btrim(v_city)) else p_group_id::text end;
 if v_scope='city' and nullif(v_key,'') is null then return; end if;
 if v_scope='group' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid)) then raise exception 'You are not a member of this group'; end if;
 return query select wr.week_start,wr.rank,wr.user_id,coalesce(nullif(btrim(p.display_name),''),'Member')::text,p.avatar_url,wr.steps from public.weekly_results wr join public.profiles p on p.id=wr.user_id where wr.scope=v_scope and wr.scope_key=v_key and (v_scope<>'group' or wr.group_id=p_group_id) and wr.rank<=3 order by wr.week_start desc,wr.rank,lower(coalesce(p.display_name,'')) limit v_limit*3;
end; $function$


CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text, p_group_id uuid DEFAULT NULL::uuid, p_period text DEFAULT 'this_week'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(rank bigint, user_id uuid, username text, avatar_url text, steps bigint, last_week_rank bigint, steps_to_pass bigint, rival_username text, improvement numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=(select auth.uid()); v_city text; v_scope text:=lower(trim(coalesce(p_scope,'world'))); v_period text:=lower(trim(coalesce(p_period,'this_week'))); v_city_key text; v_limit integer:=least(greatest(coalesce(p_limit,50),1),1000); v_offset integer:=greatest(coalesce(p_offset,0),0); v_week date:=((now() at time zone 'Africa/Nairobi')::date-(extract(isodow from (now() at time zone 'Africa/Nairobi'))::integer-1)); v_count_synced boolean;
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


CREATE OR REPLACE FUNCTION public.get_member_stats(p_user_id uuid, p_scope text DEFAULT 'world'::text, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(username text, avatar_url text, rank bigint, steps_today bigint, estimated_distance_km numeric, weekly_wins bigint, best_week bigint, top_10_finishes bigint, climb_vs_last_week bigint, recent_activity jsonb, last_week_rank bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=(select auth.uid()); v_city text; v_target_city text; v_scope text:=lower(trim(coalesce(p_scope,'world'))); v_city_key text; v_week date:=((now() at time zone 'Africa/Nairobi')::date-(extract(isodow from (now() at time zone 'Africa/Nairobi'))::integer-1)); v_scope_key text; v_rank bigint; v_last_rank bigint; v_weekly_wins bigint; v_best_week bigint; v_top10 bigint; v_current_week_steps bigint; v_steps_today bigint; v_activity jsonb;
begin
 if v_uid is null then raise exception 'Authentication required'; end if; if p_user_id is null then raise exception 'Member is required'; end if; if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
 select city into v_city from public.profiles where id=v_uid; select city into v_target_city from public.profiles where id=p_user_id; v_city_key:=lower(btrim(v_city));
 if v_scope='city' and (nullif(v_city_key,'') is null or nullif(lower(btrim(v_target_city)),'') is null or v_city_key<>lower(btrim(v_target_city))) then raise exception 'Member is outside this city leaderboard'; end if;
 if v_scope='group' then if p_group_id is null then raise exception 'Group is required'; end if; if not exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid) or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=p_user_id) then raise exception 'Member is outside this group leaderboard'; end if; end if;
 v_scope_key:=case when v_scope='world' then 'world' when v_scope='city' then lower(btrim(v_target_city)) else p_group_id::text end;
 select rank into v_rank from public.get_leaderboard(v_scope,p_group_id,'this_week',100,0) where user_id=p_user_id limit 1;
 select rank into v_last_rank from public.weekly_results where week_start=v_week-7 and user_id=p_user_id and scope=v_scope and scope_key=v_scope_key and (v_scope<>'group' or group_id=p_group_id) limit 1;
 select count(*) filter(where rank=1),coalesce(max(steps),0),count(*) filter(where rank<=10) into v_weekly_wins,v_best_week,v_top10 from public.weekly_results where user_id=p_user_id and scope=v_scope and scope_key=v_scope_key and (v_scope<>'group' or group_id=p_group_id);
 select coalesce(sum(ds.steps),0) into v_current_week_steps from public.daily_steps ds where ds.user_id=p_user_id and ds.step_date>=v_week and ds.step_date<v_week+7 and not ds.is_flagged and (not (select count_synced_only from public.leaderboard_settings where id=true) or lower(ds.source)='synced');
 select coalesce(steps,0) into v_steps_today from public.daily_steps where user_id=p_user_id and step_date=(now() at time zone 'Africa/Nairobi')::date;
 select jsonb_agg(jsonb_build_object('day',gs::date,'steps',coalesce(ds.steps,0)) order by gs::date) into v_activity from generate_series(v_week,v_week+6,interval '1 day') gs left join public.daily_steps ds on ds.user_id=p_user_id and ds.step_date=gs::date;
 return query select coalesce(nullif(btrim(p.display_name),''),'Member')::text,p.avatar_url,v_rank,v_steps_today,round(v_current_week_steps::numeric*0.00075,1),coalesce(v_weekly_wins,0),coalesce(v_best_week,0),coalesce(v_top10,0),case when v_last_rank is null or v_rank is null then null else v_last_rank-v_rank end,v_activity,v_last_rank from public.profiles p where p.id=p_user_id;
end; $function$


CREATE OR REPLACE FUNCTION public.get_my_rank(p_scope text, p_group_id uuid DEFAULT NULL::uuid, p_period text DEFAULT 'this_week'::text)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select rank from public.get_leaderboard(p_scope,p_group_id,p_period,1000,0) where user_id=(select auth.uid()) limit 1; $function$
revoke all on function public.apply_daily_steps_delta(date,integer,text,timestamptz) from public,anon; grant execute on function public.apply_daily_steps_delta(date,integer,text,timestamptz) to authenticated;
revoke all on function public.finalize_weekly_results(date) from public,anon,authenticated;
revoke all on function public.get_leaderboard(text,uuid,text,integer,integer) from public,anon; grant execute on function public.get_leaderboard(text,uuid,text,integer,integer) to authenticated;
revoke all on function public.get_member_stats(uuid,text,uuid) from public,anon; grant execute on function public.get_member_stats(uuid,text,uuid) to authenticated;
revoke all on function public.get_hall_of_fame(text,uuid,integer) from public,anon; grant execute on function public.get_hall_of_fame(text,uuid,integer) to authenticated;
revoke all on function public.get_my_rank(text,uuid,text) from public,anon; grant execute on function public.get_my_rank(text,uuid,text) to authenticated;
select public.finalize_weekly_results();
select cron.unschedule(jobid) from cron.job where jobname='protlys-weekly-leaderboard';
select cron.schedule('protlys-weekly-leaderboard','5 21 * * 0','select public.finalize_weekly_results();');