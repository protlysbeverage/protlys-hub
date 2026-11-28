create or replace function public.challenge_member_counts(p_challenge_ids bigint[])
returns table(challenge_id bigint,member_count bigint)
language sql
stable
security invoker
set search_path = ''
as $function$
  select cm.challenge_id,count(*)::bigint
  from public.challenge_members cm
  where cm.challenge_id=any(p_challenge_ids)
  group by cm.challenge_id;
$function$;

create or replace function private.founding_capacity_for_count(p_count integer)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $function$
  select case
    when p_count <= 250 then 250
    when p_count <= 500 then 500
    when p_count <= 1000 then 1000
    when p_count <= 2500 then 2500
    when p_count <= 5000 then 5000
    else 10000
  end;
$function$;
