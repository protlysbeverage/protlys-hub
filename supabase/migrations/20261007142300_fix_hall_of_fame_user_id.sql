-- Fix Hall of Fame ambiguity caused by RETURNS TABLE(user_id) colliding with group_members.user_id.
create or replace function public.get_hall_of_fame(
  p_scope text,
  p_group_id uuid default null,
  p_limit integer default 12
)
returns table(
  week_start date,
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  steps bigint
)
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_city text;
  v_key text;
  v_scope text := lower(trim(coalesce(p_scope,'world')));
  v_limit integer := least(greatest(coalesce(p_limit,12),1),52);
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_scope not in ('world','city','group') then raise exception 'Invalid leaderboard scope'; end if;

  select p.city into v_city
  from public.profiles p
  where p.id = v_uid;

  v_key := case
    when v_scope='world' then 'world'
    when v_scope='city' then lower(btrim(v_city))
    else p_group_id::text
  end;

  if v_scope='city' and nullif(v_key,'') is null then return; end if;

  if v_scope='group' and (
    p_group_id is null
    or not exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = v_uid
    )
  ) then
    raise exception 'You are not a member of this group';
  end if;

  return query
  select
    wr.week_start,
    wr.rank,
    wr.user_id,
    coalesce(nullif(btrim(p.display_name),''),'Member')::text,
    p.avatar_url,
    wr.steps
  from public.weekly_results wr
  join public.profiles p
    on p.id = wr.user_id
  where wr.scope = v_scope
    and wr.scope_key = v_key
    and (v_scope <> 'group' or wr.group_id = p_group_id)
    and wr.rank <= 3
  order by
    wr.week_start desc,
    wr.rank,
    lower(coalesce(p.display_name,''))
  limit v_limit * 3;
end;
$function$;

revoke all on function public.get_hall_of_fame(text,uuid,integer) from public,anon;
grant execute on function public.get_hall_of_fame(text,uuid,integer) to authenticated;
