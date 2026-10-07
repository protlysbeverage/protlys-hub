-- Finalize the weekly leaderboard function: expose rival name and improvement percentage.
DROP FUNCTION IF EXISTS public.get_leaderboard(text,uuid,text,integer,integer);
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

REVOKE ALL ON FUNCTION public.get_leaderboard(text,uuid,text,integer,integer) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text,uuid,text,integer,integer) TO authenticated;
