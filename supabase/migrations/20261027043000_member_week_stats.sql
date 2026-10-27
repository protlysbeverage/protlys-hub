create or replace function public.get_member_week_stats(p_user_id uuid,p_group_id uuid,p_week_start date)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_uid uuid:=(select auth.uid()); v_shared boolean; v_visible boolean; v_days jsonb;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select coalesce(p.show_group_steps,false) or p.id=v_uid into v_visible from public.profiles p where p.id=p_user_id;
 if p_group_id is not null then
   select exists(select 1 from public.group_members a join public.group_members b on b.group_id=a.group_id where a.group_id=p_group_id and a.user_id=v_uid and b.user_id=p_user_id) into v_shared;
 else
   select exists(select 1 from public.group_members a join public.group_members b on b.group_id=a.group_id where a.user_id=v_uid and b.user_id=p_user_id) into v_shared;
 end if;
 if p_user_id<>v_uid and not coalesce(v_shared,false) then raise exception 'Not a shared group member'; end if;
 if not coalesce(v_visible,false) then return jsonb_build_object('steps_visible',false); end if;
 select jsonb_agg(jsonb_build_object('date',d::date,'steps',coalesce(ds.steps,0)) order by d)
 into v_days from generate_series(p_week_start,p_week_start+6,'1 day') d
 left join public.daily_steps ds on ds.user_id=p_user_id and ds.step_date=d::date and not coalesce(ds.is_flagged,false);
 return jsonb_build_object('steps_visible',true,'week_start',p_week_start,'days',coalesce(v_days,'[]'::jsonb));
end $$;
revoke execute on function public.get_member_week_stats(uuid,uuid,date) from public,anon;
grant execute on function public.get_member_week_stats(uuid,uuid,date) to authenticated;
