drop policy if exists "challenges: read" on public.challenges;
create policy "challenges: read"
on public.challenges for select to authenticated
using (
  coalesce(public.is_current_user_admin(), false)
  or visibility = 'public'
  or creator_id = (select auth.uid())
  or id in (select private.user_challenge_ids())
  or (group_id is not null and private.is_group_member(group_id, (select auth.uid())))
);

drop policy if exists "challenge_members: insert" on public.challenge_members;
create policy "challenge_members: insert"
on public.challenge_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id
      and (
        c.creator_id = (select auth.uid())
        or c.visibility = 'public'
        or (c.group_id is not null and private.is_group_member(c.group_id, (select auth.uid())))
      )
  )
);

create or replace function public.get_challenge_invite(p_challenge_id bigint,p_invite_token text default null)
returns table(
  id bigint, creator_id uuid, name text, description text, emoji text, step_target integer,
  challenge_type text, target numeric, scoring_mode text, start_date date, end_date date,
  visibility text, allow_teams boolean, created_at timestamptz, group_id uuid
)
language plpgsql stable security definer set search_path = ''
as $function$
declare v_challenge public.challenges%rowtype; v_user_id uuid := auth.uid();
begin
  select * into v_challenge from public.challenges c where c.id = p_challenge_id;
  if not found then return; end if;
  if not (
    v_challenge.visibility = 'public'
    or v_challenge.creator_id = v_user_id
    or (v_challenge.group_id is not null and v_user_id is not null and private.is_group_member(v_challenge.group_id, v_user_id))
    or (v_challenge.group_id is null and v_challenge.visibility in ('private','invite') and p_invite_token is not null and v_challenge.invite_token = p_invite_token)
  ) then return; end if;
  return query select v_challenge.id,v_challenge.creator_id,v_challenge.name,v_challenge.description,
    v_challenge.emoji,v_challenge.step_target,v_challenge.challenge_type,v_challenge.target,
    v_challenge.scoring_mode,v_challenge.start_date,v_challenge.end_date,v_challenge.visibility,
    v_challenge.allow_teams,v_challenge.created_at,v_challenge.group_id;
end;
$function$;
revoke all on function public.get_challenge_invite(bigint,text) from public;
revoke all on function public.get_challenge_invite(bigint,text) from anon;
grant execute on function public.get_challenge_invite(bigint,text) to anon,authenticated;

create or replace function public.join_challenge_by_invite_token(p_challenge_id bigint,p_invite_token text default null)
returns boolean
language plpgsql security definer set search_path = ''
as $function$
declare v_user_id uuid := auth.uid(); v_challenge public.challenges%rowtype;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  select * into v_challenge from public.challenges c where c.id = p_challenge_id;
  if not found then raise exception 'Challenge not found'; end if;
  if not (
    v_challenge.visibility = 'public'
    or v_challenge.creator_id = v_user_id
    or (v_challenge.group_id is not null and private.is_group_member(v_challenge.group_id,v_user_id))
    or (v_challenge.group_id is null and v_challenge.visibility in ('private','invite') and p_invite_token is not null and v_challenge.invite_token = p_invite_token)
  ) then raise exception 'This challenge is private or the invitation is invalid'; end if;
  insert into public.challenge_members(challenge_id,user_id) values(p_challenge_id,v_user_id)
  on conflict(challenge_id,user_id) do nothing;
  return true;
end;
$function$;
revoke all on function public.join_challenge_by_invite_token(bigint,text) from public;
revoke all on function public.join_challenge_by_invite_token(bigint,text) from anon;
grant execute on function public.join_challenge_by_invite_token(bigint,text) to authenticated;

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
    select user_id,progress,row_number() over(order by progress desc,reached_day asc nulls last,joined_at asc,user_id) as rank,
      case when reached_day is null then null else reached_day::timestamp at time zone 'Africa/Nairobi' end as reached_at,joined_at
    from per_user
  )
  select ranked.user_id,ranked.progress,ranked.rank,ranked.reached_at,ranked.joined_at from ranked order by ranked.rank;
end;
$function$;
revoke all on function public.challenge_progress(bigint) from public;
revoke all on function public.challenge_progress(bigint) from anon;
grant execute on function public.challenge_progress(bigint) to authenticated;

create or replace function public.challenge_member_previews(p_challenge_ids bigint[],p_limit_per_challenge integer default 5)
returns table(challenge_id bigint,user_id uuid,joined_at timestamptz)
language sql stable security invoker set search_path = ''
as $function$
  with ranked as (
    select cm.challenge_id,cm.user_id,cm.joined_at,
      row_number() over(partition by cm.challenge_id order by cm.joined_at asc,cm.user_id) as position
    from public.challenge_members cm
    where cm.challenge_id=any(coalesce(p_challenge_ids,'{}'::bigint[]))
  )
  select challenge_id,user_id,joined_at from ranked
  where position<=greatest(1,least(coalesce(p_limit_per_challenge,5),10))
  order by challenge_id,position;
$function$;
revoke all on function public.challenge_member_previews(bigint[],integer) from public;
revoke all on function public.challenge_member_previews(bigint[],integer) from anon;
grant execute on function public.challenge_member_previews(bigint[],integer) to authenticated;
