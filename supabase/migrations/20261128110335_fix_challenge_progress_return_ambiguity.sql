create or replace function public.challenge_progress(p_challenge_id bigint)
returns table(user_id uuid,progress numeric,rank bigint,reached_at timestamptz,joined_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $function$
declare v_user_id uuid := auth.uid(); v_challenge public.challenges%rowtype;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  select * into v_challenge from public.challenges c where c.id=p_challenge_id;
  if not found then return; end if;
  if not (
    v_challenge.visibility='public'
    or v_challenge.creator_id=v_user_id
    or exists(select 1 from public.challenge_members cm where cm.challenge_id=p_challenge_id and cm.user_id=v_user_id)
    or (v_challenge.group_id is not null and private.is_group_member(v_challenge.group_id,v_user_id))
    or coalesce(public.is_current_user_admin(),false)
  ) then raise exception 'Not authorized to view challenge progress'; end if;

  return query
  with c as (
    select id,challenge_type,target,scoring_mode,start_date,end_date,group_id
    from public.challenges where id=p_challenge_id
  ),
  members as (
    select cm.user_id,cm.joined_at from public.challenge_members cm where cm.challenge_id=p_challenge_id
  ),
  daily as (
    select m.user_id,d.step_date as day,greatest(0,d.steps)::numeric as value
    from members m join c on true join public.profiles pr on pr.id=m.user_id
    join public.daily_steps d on d.user_id=m.user_id and d.step_date between c.start_date and c.end_date
    where c.challenge_type in ('steps','movement_days','distance')
      and (c.group_id is null or m.user_id=v_user_id or pr.show_group_steps)
    union all
    select m.user_id,p.log_date as day,greatest(0,p.grams)::numeric as value
    from members m join c on true join public.profiles pr on pr.id=m.user_id
    join public.protein_logs p on p.user_id=m.user_id and p.log_date between c.start_date and c.end_date
    where c.challenge_type='protein'
      and (c.group_id is null or m.user_id=v_user_id or pr.show_group_protein)
    union all
    select m.user_id,(s.completed_at at time zone 'Africa/Nairobi')::date as day,greatest(0,s.minutes)::numeric as value
    from members m join c on true
    join public.meditation_sessions s on s.user_id=m.user_id
      and (s.completed_at at time zone 'Africa/Nairobi')::date between c.start_date and c.end_date
    where c.challenge_type='stillness'
  ),
  daily_agg as (
    select m.user_id,m.joined_at,c.target,c.scoring_mode,c.challenge_type,d.day,
      case c.challenge_type
        when 'distance' then d.value*0.00075
        when 'movement_days' then case when d.value>0 then 1 else 0 end
        else d.value
      end as value
    from members m cross join c left join daily d on d.user_id=m.user_id
  ),
  per_user as (
    select m.user_id,m.joined_at,c.target,c.scoring_mode,
      case when c.scoring_mode='days_hit'
        then coalesce(sum(case when (c.challenge_type='movement_days' and a.value>=1)
          or (c.challenge_type<>'movement_days' and a.value>=c.target) then 1 else 0 end),0)
        else coalesce(sum(a.value),0)
      end as progress,
      min(case
        when c.scoring_mode='days_hit' and ((c.challenge_type='movement_days' and a.value>=1)
          or (c.challenge_type<>'movement_days' and a.value>=c.target)) then a.day
        when c.scoring_mode='total' and (select coalesce(sum(a2.value),0) from daily_agg a2 where a2.user_id=m.user_id and a2.day<=a.day)>=c.target then a.day
      end) as reached_day
    from members m cross join c left join daily_agg a on a.user_id=m.user_id
    group by m.user_id,m.joined_at,c.target,c.scoring_mode,c.challenge_type
  ),
  ranked as (
    select per_user.user_id,per_user.progress,
      row_number() over(order by per_user.progress desc,per_user.reached_day asc nulls last,per_user.joined_at asc,per_user.user_id) as rank,
      case when per_user.reached_day is null then null else per_user.reached_day::timestamp at time zone 'Africa/Nairobi' end as reached_at,
      per_user.joined_at
    from per_user
  )
  select ranked.user_id,ranked.progress,ranked.rank,ranked.reached_at,ranked.joined_at
  from ranked order by ranked.rank;
end;
$function$;
revoke all on function public.challenge_progress(bigint) from public;
revoke all on function public.challenge_progress(bigint) from anon;
grant execute on function public.challenge_progress(bigint) to authenticated;
