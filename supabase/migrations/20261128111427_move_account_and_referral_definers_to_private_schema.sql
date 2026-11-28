create or replace function private.add_user_to_founding_250(p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $function$
declare v_group_id uuid;
begin
  if p_user_id is null then return; end if;
  select id into v_group_id from public.groups where name='Founding 250' order by created_at asc limit 1;
  if v_group_id is not null then
    insert into public.group_members(group_id,user_id) values(v_group_id,p_user_id)
    on conflict(group_id,user_id) do nothing;
  end if;
end;
$function$;
revoke all on function private.add_user_to_founding_250(uuid) from public,anon,authenticated;

create or replace function private.ensure_founding_250_group_member()
returns void language plpgsql security definer set search_path=''
as $function$
begin
  if auth.uid() is not null then perform private.add_user_to_founding_250(auth.uid()); end if;
end;
$function$;
revoke all on function private.ensure_founding_250_group_member() from public,anon;
grant execute on function private.ensure_founding_250_group_member() to authenticated;

create or replace function private.ensure_founding_250_member()
returns void language plpgsql security definer set search_path=''
as $function$
declare v_challenge_id bigint; v_user_id uuid:=auth.uid();
begin
  if v_user_id is null then return; end if;
  select id into v_challenge_id from public.challenges where name='Founding 250' order by created_at asc limit 1;
  if v_challenge_id is not null then
    insert into public.challenge_members(challenge_id,user_id) values(v_challenge_id,v_user_id)
    on conflict(challenge_id,user_id) do nothing;
  end if;
end;
$function$;
revoke all on function private.ensure_founding_250_member() from public,anon;
grant execute on function private.ensure_founding_250_member() to authenticated;

create or replace function private.ensure_referral_code()
returns text language plpgsql security definer set search_path=''
as $function$
declare v_user_id uuid:=auth.uid(); v_code text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select referral_code into v_code from public.profiles where id=v_user_id;
  if v_code is not null then return v_code; end if;
  loop
    v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||v_user_id::text),1,10));
    exit when not exists(select 1 from public.profiles where referral_code=v_code);
  end loop;
  update public.profiles set referral_code=v_code where id=v_user_id and referral_code is null;
  select referral_code into v_code from public.profiles where id=v_user_id;
  return v_code;
end;
$function$;
revoke all on function private.ensure_referral_code() from public,anon;
grant execute on function private.ensure_referral_code() to authenticated;

create or replace function private.apply_referral_code(p_code text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_user_id uuid:=auth.uid(); v_referrer_id uuid; v_created_at timestamptz; v_updated integer:=0;
begin
  if v_user_id is null or p_code is null or length(trim(p_code))<4 or length(trim(p_code))>32 then return false; end if;
  select created_at into v_created_at from auth.users where id=v_user_id;
  if v_created_at is null or v_created_at<now()-interval '30 days' then return false; end if;
  select id into v_referrer_id from public.profiles where referral_code=upper(trim(p_code)) and id<>v_user_id limit 1;
  if v_referrer_id is null then return false; end if;
  update public.profiles set referred_by=v_referrer_id where id=v_user_id and referred_by is null;
  get diagnostics v_updated=row_count;
  return v_updated>0;
end;
$function$;
revoke all on function private.apply_referral_code(text) from public,anon;
grant execute on function private.apply_referral_code(text) to authenticated;

create or replace function private.get_referral_stats()
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_user_id uuid:=auth.uid(); v_invited bigint; v_joined bigint;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select count(*) into v_invited from public.referral_clicks where referrer_id=v_user_id;
  select count(*) into v_joined from public.profiles where referred_by=v_user_id;
  return jsonb_build_object('invited_count',coalesce(v_invited,0),'joined_count',coalesce(v_joined,0));
end;
$function$;
revoke all on function private.get_referral_stats() from public,anon;
grant execute on function private.get_referral_stats() to authenticated;

create or replace function private.get_hub_member_count()
returns integer language sql security definer set search_path=''
as $function$
  select count(*)::integer from public.profiles;
$function$;
revoke all on function private.get_hub_member_count() from public;
grant execute on function private.get_hub_member_count() to anon,authenticated;

create or replace function private.record_referral_click(p_code text,p_visitor_id text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_referrer_id uuid; v_inserted integer:=0;
begin
  if p_code is null or length(trim(p_code))<4 or length(trim(p_code))>32
     or p_visitor_id is null or length(trim(p_visitor_id))<16 or length(trim(p_visitor_id))>80 then return false; end if;
  select id into v_referrer_id from public.profiles where referral_code=upper(trim(p_code));
  if v_referrer_id is null or v_referrer_id=auth.uid() then return false; end if;
  insert into public.referral_clicks(referrer_id,visitor_id) values(v_referrer_id,trim(p_visitor_id))
  on conflict(referrer_id,visitor_id) do nothing;
  get diagnostics v_inserted=row_count;
  return v_inserted>0;
end;
$function$;
revoke all on function private.record_referral_click(text,text) from public;
grant execute on function private.record_referral_click(text,text) to anon,authenticated;

create or replace function private.get_group_member_profile(
  p_user_id uuid,p_group_id uuid,p_local_date date,p_timezone text default 'Africa/Nairobi'
)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare
 v_uid uuid:=(select auth.uid()); v_shared boolean; v_steps boolean; v_protein boolean; v_result jsonb;
 v_group uuid; v_rank bigint; v_week date; v_prev_total bigint;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select exists(select 1 from public.group_members a join public.group_members b on b.group_id=a.group_id where a.user_id=v_uid and b.user_id=p_user_id) into v_shared;
 if not v_shared and v_uid<>p_user_id then raise exception 'Not a shared group member'; end if;
 select show_group_steps,show_group_protein into v_steps,v_protein from public.profiles where id=p_user_id;
 v_steps:=coalesce(v_steps,false) or v_uid=p_user_id;
 v_protein:=coalesce(v_protein,false) or v_uid=p_user_id;
 if p_group_id is not null and exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid) and exists(select 1 from public.group_members where group_id=p_group_id and user_id=p_user_id) then
   v_group:=p_group_id;
 else
   select a.group_id into v_group from public.group_members a join public.group_members b on b.group_id=a.group_id
   where a.user_id=v_uid and b.user_id=p_user_id
   order by (select count(*) from public.group_members x where x.group_id=a.group_id) desc,a.group_id limit 1;
 end if;
 v_week:=p_local_date-(extract(isodow from p_local_date)::int-1);
 if v_steps then
   select l.rank into v_rank from public.get_group_leaderboard(v_group,'this_week',1000,0) l where l.user_id=p_user_id;
   select coalesce(sum(ds.steps),0)::bigint into v_prev_total from public.daily_steps ds
   where ds.user_id=p_user_id and ds.step_date between p_local_date-13 and p_local_date-7 and not coalesce(ds.is_flagged,false);
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
  'challenges_joined',(select count(*)::bigint from public.challenge_members cm join public.challenges ch on ch.id=cm.challenge_id where cm.user_id=p.id and p_local_date between ch.start_date and ch.end_date),
  'cheered_today',exists(select 1 from public.cheers ch where ch.from_user_id=v_uid and ch.to_user_id=p.id and (ch.created_at at time zone 'Africa/Nairobi')::date=p_local_date),
  'group_id',v_group
 )) into v_result from public.profiles p where p.id=p_user_id;
 return v_result;
end;
$function$;
revoke all on function private.get_group_member_profile(uuid,uuid,date,text) from public,anon;
grant execute on function private.get_group_member_profile(uuid,uuid,date,text) to authenticated;

drop function if exists public.add_user_to_founding_250(uuid);

create or replace function public.ensure_founding_250_group_member()
returns void language sql security invoker set search_path=''
as $function$ select private.ensure_founding_250_group_member(); $function$;
revoke all on function public.ensure_founding_250_group_member() from public,anon;
grant execute on function public.ensure_founding_250_group_member() to authenticated;

create or replace function public.ensure_founding_250_member()
returns void language sql security invoker set search_path=''
as $function$ select private.ensure_founding_250_member(); $function$;
revoke all on function public.ensure_founding_250_member() from public,anon;
grant execute on function public.ensure_founding_250_member() to authenticated;

create or replace function public.ensure_referral_code()
returns text language sql security invoker set search_path=''
as $function$ select private.ensure_referral_code(); $function$;
revoke all on function public.ensure_referral_code() from public,anon;
grant execute on function public.ensure_referral_code() to authenticated;

create or replace function public.apply_referral_code(p_code text)
returns boolean language sql security invoker set search_path=''
as $function$ select private.apply_referral_code(p_code); $function$;
revoke all on function public.apply_referral_code(text) from public,anon;
grant execute on function public.apply_referral_code(text) to authenticated;

create or replace function public.get_referral_stats()
returns jsonb language sql security invoker set search_path=''
as $function$ select private.get_referral_stats(); $function$;
revoke all on function public.get_referral_stats() from public,anon;
grant execute on function public.get_referral_stats() to authenticated;

create or replace function public.get_hub_member_count()
returns integer language sql security invoker set search_path=''
as $function$ select private.get_hub_member_count(); $function$;
revoke all on function public.get_hub_member_count() from public;
grant execute on function public.get_hub_member_count() to anon,authenticated;

create or replace function public.record_referral_click(p_code text,p_visitor_id text)
returns boolean language sql security invoker set search_path=''
as $function$ select private.record_referral_click(p_code,p_visitor_id); $function$;
revoke all on function public.record_referral_click(text,text) from public;
grant execute on function public.record_referral_click(text,text) to anon,authenticated;

create or replace function public.get_group_member_profile(p_user_id uuid,p_group_id uuid,p_local_date date)
returns jsonb language sql stable security invoker set search_path=''
as $function$ select private.get_group_member_profile(p_user_id,p_group_id,p_local_date,'Africa/Nairobi'); $function$;
revoke all on function public.get_group_member_profile(uuid,uuid,date) from public,anon;
grant execute on function public.get_group_member_profile(uuid,uuid,date) to authenticated;

create or replace function public.get_group_member_profile(p_user_id uuid,p_group_id uuid,p_local_date date,p_timezone text default 'Africa/Nairobi')
returns jsonb language sql stable security invoker set search_path=''
as $function$ select private.get_group_member_profile(p_user_id,p_group_id,p_local_date,p_timezone); $function$;
revoke all on function public.get_group_member_profile(uuid,uuid,date,text) from public,anon;
grant execute on function public.get_group_member_profile(uuid,uuid,date,text) to authenticated;
