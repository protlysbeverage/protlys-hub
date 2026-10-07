-- Protlys Hub leaderboard: monthly ranking, aggregate stats, and raw-step privacy hardening
alter table public.profiles add column if not exists city text;
create index if not exists idx_daily_steps_user_date on public.daily_steps(user_id, step_date);

drop policy if exists "steps: authenticated read" on public.daily_steps;
create policy "steps: owner read" on public.daily_steps
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.get_leaderboard(
  p_scope text, p_group_id uuid default null, p_limit integer default 50, p_offset integer default 0
)
returns table(rank bigint, user_id uuid, username text, avatar_url text, steps bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_city text;
  v_scope text := lower(trim(coalesce(p_scope, 'world')));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
  select p.city into v_city from public.profiles p where p.id=v_uid;
  if v_scope='city' and nullif(btrim(v_city),'') is null then return; end if;
  if v_scope='group' then
    if p_group_id is null then raise exception 'Group is required'; end if;
    if not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=v_uid) then
      raise exception 'You are not a member of this group';
    end if;
  end if;
  return query
  with eligible as (
    select p.id, coalesce(nullif(btrim(p.display_name),''),'Member')::text as username, p.avatar_url,
           coalesce(sum(ds.steps),0)::bigint as steps
    from public.profiles p
    left join public.daily_steps ds on ds.user_id=p.id
      and ds.step_date >= date_trunc('month',(now() at time zone 'Africa/Nairobi'))::date
      and ds.step_date < (date_trunc('month',(now() at time zone 'Africa/Nairobi')) + interval '1 month')::date
    where v_scope='world'
       or (v_scope='city' and lower(btrim(p.city))=lower(btrim(v_city)))
       or (v_scope='group' and exists(select 1 from public.group_members gm2 where gm2.group_id=p_group_id and gm2.user_id=p.id))
    group by p.id,p.display_name,p.avatar_url
  ),
  ranked as (
    select rank() over(order by e.steps desc) as rank,e.id as user_id,e.username,e.avatar_url,e.steps
    from eligible e
  )
  select r.rank,r.user_id,r.username,r.avatar_url,r.steps
  from ranked r
  order by r.rank asc,lower(r.username) asc,r.user_id asc
  limit v_limit offset v_offset;
end;
$$;

create or replace function public.get_my_rank(p_scope text,p_group_id uuid default null)
returns bigint
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_city text;
  v_scope text := lower(trim(coalesce(p_scope,'world')));
  v_rank bigint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
  select p.city into v_city from public.profiles p where p.id=v_uid;
  if v_scope='city' and nullif(btrim(v_city),'') is null then return null; end if;
  if v_scope='group' then
    if p_group_id is null then raise exception 'Group is required'; end if;
    if not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=v_uid) then
      raise exception 'You are not a member of this group';
    end if;
  end if;
  with eligible as (
    select p.id,coalesce(sum(ds.steps),0)::bigint as steps
    from public.profiles p
    left join public.daily_steps ds on ds.user_id=p.id
      and ds.step_date >= date_trunc('month',(now() at time zone 'Africa/Nairobi'))::date
      and ds.step_date < (date_trunc('month',(now() at time zone 'Africa/Nairobi')) + interval '1 month')::date
    where v_scope='world'
       or (v_scope='city' and lower(btrim(p.city))=lower(btrim(v_city)))
       or (v_scope='group' and exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p.id))
    group by p.id
  ),
  ranked as (select id,rank() over(order by steps desc) as r from eligible)
  select r.r into v_rank from ranked r where r.id=v_uid;
  return v_rank;
end;
$$;

create or replace function public.get_member_stats(p_user_id uuid,p_scope text default 'world',p_group_id uuid default null)
returns table(
  username text, avatar_url text, rank bigint, steps_today bigint,
  estimated_distance_km numeric, movement_days integer, lifetime_steps bigint, recent_activity jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_city text;
  v_target_city text;
  v_scope text := lower(trim(coalesce(p_scope,'world')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_user_id is null then raise exception 'Member is required'; end if;
  if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;
  select p.city into v_city from public.profiles p where p.id=v_uid;
  select p.city into v_target_city from public.profiles p where p.id=p_user_id;
  if v_scope='city' and (nullif(btrim(v_city),'') is null or nullif(btrim(v_target_city),'') is null or lower(btrim(v_city))<>lower(btrim(v_target_city))) then
    raise exception 'Member is outside this city leaderboard';
  end if;
  if v_scope='group' then
    if p_group_id is null then raise exception 'Group is required'; end if;
    if not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=v_uid)
       or not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p_user_id) then
      raise exception 'Member is outside this group leaderboard';
    end if;
  end if;
  return query
  with monthly as (
    select p.id,coalesce(sum(ds.steps),0)::bigint as steps
    from public.profiles p
    left join public.daily_steps ds on ds.user_id=p.id
      and ds.step_date >= date_trunc('month',(now() at time zone 'Africa/Nairobi'))::date
      and ds.step_date < (date_trunc('month',(now() at time zone 'Africa/Nairobi')) + interval '1 month')::date
    where v_scope='world'
       or (v_scope='city' and lower(btrim(p.city))=lower(btrim(v_city)))
       or (v_scope='group' and exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p.id))
    group by p.id
  ),
  ranked as (select id,rank() over(order by steps desc) as r from monthly),
  seven as (
    select gs::date as day,
           coalesce((select d.steps from public.daily_steps d where d.user_id=p_user_id and d.step_date=gs::date),0)::bigint as steps
    from generate_series((now() at time zone 'Africa/Nairobi')::date-6,(now() at time zone 'Africa/Nairobi')::date,interval '1 day') gs
  )
  select
    coalesce(nullif(btrim(p.display_name),''),'Member')::text,p.avatar_url,r.r,
    coalesce((select s.steps from seven s where s.day=(now() at time zone 'Africa/Nairobi')::date),0)::bigint,
    round(coalesce(p.total_steps,0)::numeric*0.00075,1),
    (select count(*)::int from seven s where s.steps>0),
    coalesce(p.total_steps,0)::bigint,
    (select jsonb_agg(jsonb_build_object('day',s.day,'steps',s.steps) order by s.day) from seven s)
  from public.profiles p join ranked r on r.id=p.id
  where p.id=p_user_id;
end;
$$;

revoke all on function public.get_leaderboard(text,uuid,integer,integer) from public,anon;
revoke all on function public.get_my_rank(text,uuid) from public,anon;
revoke all on function public.get_member_stats(uuid,text,uuid) from public,anon;
grant execute on function public.get_leaderboard(text,uuid,integer,integer) to authenticated;
grant execute on function public.get_my_rank(text,uuid) to authenticated;
grant execute on function public.get_member_stats(uuid,text,uuid) to authenticated;
