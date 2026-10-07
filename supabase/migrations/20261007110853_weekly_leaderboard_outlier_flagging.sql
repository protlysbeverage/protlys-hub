-- Flag daily step totals above the configured review threshold instead of counting them.
create or replace function public.flag_daily_step_outlier()
returns trigger
language plpgsql
set search_path=''
as $$
declare v_limit integer;
begin
  select max_single_entry_steps into v_limit
  from public.leaderboard_settings where id=true;
  if new.steps > v_limit then
    new.is_flagged := true;
    new.flag_reason := format('daily_steps_above_review_threshold_%s', v_limit);
  elsif lower(coalesce(new.source,'')) not in ('manual','synced') then
    new.is_flagged := true;
    new.flag_reason := 'unknown_step_source';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_flag_daily_step_outlier on public.daily_steps;
create trigger trg_flag_daily_step_outlier
before insert or update of steps,source on public.daily_steps
for each row execute function public.flag_daily_step_outlier();

revoke all on function public.flag_daily_step_outlier() from public,anon,authenticated;