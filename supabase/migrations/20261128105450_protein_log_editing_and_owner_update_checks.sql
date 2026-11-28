drop policy if exists "protein_logs owner update" on public.protein_logs;
create policy "protein_logs owner update"
on public.protein_logs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "protein_logs owner delete" on public.protein_logs;
create policy "protein_logs owner delete"
on public.protein_logs for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "steps: owner update" on public.daily_steps;
create policy "steps: owner update"
on public.daily_steps for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "ev: owner update" on public.events;
create policy "ev: owner update"
on public.events for update to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists "goals: owner update" on public.goals;
create policy "goals: owner update"
on public.goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notifs: owner update" on public.notifications;
create policy "notifs: owner update"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: owner update" on public.profiles;
create policy "profiles: owner update"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.save_protein_target(
  p_target_g integer,
  p_source text,
  p_effective_from date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;
  if p_target_g is null or p_target_g < 20 or p_target_g > 500 then
    raise exception 'Target must be between 20g and 500g';
  end if;
  if p_source not in ('calculator', 'custom') then raise exception 'Invalid target source'; end if;
  if p_effective_from is null then raise exception 'Effective date is required'; end if;

  insert into public.protein_target_history (user_id, target_g, source, effective_from)
  values (v_user_id, p_target_g, p_source, p_effective_from);

  update public.profiles
  set target_g = p_target_g,
      onboarding_complete = case when p_source = 'calculator' then true else onboarding_complete end
  where id = v_user_id;

  if not found then raise exception 'Profile not found'; end if;
  return jsonb_build_object('ok', true, 'target_g', p_target_g, 'effective_from', p_effective_from);
end;
$function$;

revoke all on function public.save_protein_target(integer, text, date) from public;
revoke all on function public.save_protein_target(integer, text, date) from anon;
grant execute on function public.save_protein_target(integer, text, date) to authenticated;
