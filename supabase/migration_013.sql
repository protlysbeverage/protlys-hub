-- Hub onboarding and public founding-member counter
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;

create table if not exists public.hub_stats (
  id boolean primary key default true check (id = true),
  founding_count integer not null default 0 check (founding_count between 0 and 250)
);

alter table public.hub_stats enable row level security;
drop policy if exists "hub stats public read" on public.hub_stats;
create policy "hub stats public read" on public.hub_stats for select to anon, authenticated using (true);

insert into public.hub_stats (id, founding_count)
select true, least(250, count(*)::integer) from public.profiles
on conflict (id) do update set founding_count = excluded.founding_count;

create or replace function public.sync_founding_counter()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.hub_stats (id, founding_count) values (true, 1)
  on conflict (id) do update set founding_count = least(250, public.hub_stats.founding_count + 1);
  return new;
end;
$$;

drop trigger if exists on_profile_created_founding_counter on public.profiles;
create trigger on_profile_created_founding_counter after insert on public.profiles
for each row execute procedure public.sync_founding_counter();

revoke all on function public.sync_founding_counter() from public, anon, authenticated;
revoke all on function public.get_founding_member_count() from public, anon, authenticated;
drop function if exists public.get_founding_member_count();
revoke all on function public.handle_new_user() from public, anon, authenticated;
