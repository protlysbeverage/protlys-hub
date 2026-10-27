create or replace function public.challenge_progress(p_challenge_id bigint)
returns table(user_id uuid, progress numeric, rank bigint, reached_at timestamptz, joined_at timestamptz)
language sql stable security invoker set search_path=''
as $$
with c as (select id, challenge_type, target, scoring_mode, start_date, end_date from public.challenges where id=p_challenge_id),
members as (select cm.user_id, cm.joined_at from public.challenge_members cm where cm.challenge_id=p_challenge_id),
daily as (
 select m.user_id,d.step_date as day,greatest(0,d.steps)::numeric as value from members m join c on true join public.daily_steps d on d.user_id=m.user_id and d.step_date between c.start_date and c.end_date where c.challenge_type in ('steps','movement_days','distance')
 union all select m.user_id,p.log_date,greatest(0,p.grams)::numeric from members m join c on true join public.protein_logs p on p.user_id=m.user_id and p.log_date between c.start_date and c.end_date where c.challenge_type='protein'
 union all select m.user_id,(s.completed_at at time zone 'Africa/Nairobi')::date,greatest(0,s.minutes)::numeric from members m join c on true join public.meditation_sessions s on s.user_id=m.user_id and (s.completed_at at time zone 'Africa/Nairobi')::date between c.start_date and c.end_date where c.challenge_type='stillness'
),daily_agg as (
 select m.user_id,m.joined_at,c.target,c.scoring_mode,d.day,case c.challenge_type when 'distance' then d.value*0.00075 when 'movement_days' then case when d.value>0 then 1 else 0 end else d.value end value from members m cross join c left join daily d on d.user_id=m.user_id
),per_user as (
 select m.user_id,m.joined_at,c.target,c.scoring_mode,case when c.scoring_mode='days_hit' then coalesce(sum(case when (c.challenge_type='movement_days' and a.value>=1) or (c.challenge_type<>'movement_days' and a.value>=c.target) then 1 else 0 end),0) else coalesce(sum(a.value),0) end progress,min(case when c.scoring_mode='days_hit' and ((c.challenge_type='movement_days' and a.value>=1) or (c.challenge_type<>'movement_days' and a.value>=c.target)) then a.day when c.scoring_mode='total' and (select coalesce(sum(a2.value),0) from daily_agg a2 where a2.user_id=m.user_id and a2.day<=a.day)>=c.target then a.day end) reached_day from members m cross join c left join daily_agg a on a.user_id=m.user_id group by m.user_id,m.joined_at,c.target,c.scoring_mode,c.challenge_type
),ranked as (select user_id,progress,row_number() over(order by progress desc,reached_day asc nulls last,joined_at asc,user_id) rank,case when reached_day is null then null else reached_day::timestamp at time zone 'Africa/Nairobi' end reached_at,joined_at from per_user)
select user_id,progress,rank,reached_at,joined_at from ranked order by rank;
$$;
revoke execute on function public.challenge_progress(bigint) from public,anon;
grant execute on function public.challenge_progress(bigint) to authenticated;