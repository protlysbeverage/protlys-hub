-- Public challenge counts without exposing member identities.
create or replace function public.challenge_member_counts(p_challenge_ids bigint[])
returns table(challenge_id bigint, member_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, count(cm.id)::bigint
  from public.challenges c
  left join public.challenge_members cm on cm.challenge_id = c.id
  where c.id = any(p_challenge_ids)
  group by c.id
$$;

grant execute on function public.challenge_member_counts(bigint[]) to authenticated;

-- Create the two Protlys Hub community challenges if they do not already exist.
insert into public.challenges (creator_id,name,description,step_target,start_date,end_date,visibility,allow_teams)
select seed.creator_id, seed.name, seed.description, 0, current_date, current_date + 3650, 'public', false
from (
  select
    (select creator_id from public.challenges order by id limit 1) as creator_id,
    'Founding 250'::text as name,
    'Be one of the first 250 people joining the Protlys community.'::text as description
  union all
  select
    (select creator_id from public.challenges order by id limit 1),
    '5-Day Protein Week',
    'Join the community challenge. The challenge is open now; detailed tracking will be added later.'
) seed
where seed.creator_id is not null
and not exists (select 1 from public.challenges c where c.name = seed.name);

comment on function public.challenge_member_counts(bigint[]) is 'Returns public member counts for public Protlys challenges without exposing member identities.';
