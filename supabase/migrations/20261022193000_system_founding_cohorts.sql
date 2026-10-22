-- Protlys Hub — system-managed founding cohorts
-- Every registered user is automatically assigned to the current founding cohort.
-- Cohorts progress 250 -> 500 -> 1,000 -> 2,500 -> 5,000 -> 10,000.

alter table public.groups
  add column if not exists is_system boolean not null default false;

create unique index if not exists groups_founding_name_idx
  on public.groups(name)
  where is_system = true and name like 'Founding %';

create or replace function private.founding_capacity_for_count(p_count integer)
returns integer language sql immutable as $$
  select case
    when p_count <= 250 then 250
    when p_count <= 500 then 500
    when p_count <= 1000 then 1000
    when p_count <= 2500 then 2500
    when p_count <= 5000 then 5000
    else 10000
  end;
$$;

create or replace function private.ensure_founding_group(p_capacity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_group_id uuid; v_creator uuid;
begin
  select id into v_group_id from public.groups
  where is_system = true and name = 'Founding ' || p_capacity limit 1;
  if v_group_id is not null then return v_group_id; end if;

  select id into v_creator from public.profiles order by created_at asc, id asc limit 1;
  if v_creator is null then raise exception 'Cannot create founding group before a profile exists'; end if;

  insert into public.groups(name,emoji,privacy,created_by,is_system)
  values ('Founding ' || p_capacity,'P','public',v_creator,true)
  on conflict do nothing returning id into v_group_id;

  if v_group_id is null then
    select id into v_group_id from public.groups
    where is_system = true and name = 'Founding ' || p_capacity limit 1;
  end if;
  return v_group_id;
end;
$$;

create or replace function private.assign_current_founding_group()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_capacity integer; v_group_id uuid;
begin
  select count(*)::integer into v_count from public.profiles;
  v_capacity := private.founding_capacity_for_count(v_count);
  v_group_id := private.ensure_founding_group(v_capacity);

  insert into public.group_members(group_id,user_id,role)
  values(v_group_id,new.id,'member'::public.group_role)
  on conflict(group_id,user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_assign_current_founding_group on public.profiles;
create trigger trg_assign_current_founding_group
after insert on public.profiles
for each row execute function private.assign_current_founding_group();

do $$
declare v_group_id uuid;
begin
  v_group_id := private.ensure_founding_group(250);
  insert into public.group_members(group_id,user_id,role)
  select v_group_id,p.id,'member'::public.group_role
  from public.profiles p order by p.created_at asc,p.id asc limit 250
  on conflict(group_id,user_id) do nothing;
end $$;

drop policy if exists "groups: update" on public.groups;
create policy "groups: update" on public.groups
for update to authenticated
using ((not is_system) and (select private.is_group_admin(id)))
with check ((not is_system) and (select private.is_group_admin(id)));

drop policy if exists "groups: delete" on public.groups;
create policy "groups: delete" on public.groups
for delete to authenticated
using ((not is_system) and (select auth.uid())=created_by);

revoke all on function private.founding_capacity_for_count(integer) from public,anon,authenticated;
revoke all on function private.ensure_founding_group(integer) from public,anon,authenticated;
revoke all on function private.assign_current_founding_group() from public,anon,authenticated;
