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
 v_week:=p_local_date-(extract(isodow from p_local_date)::int-1);
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