create schema if not exists private;

do $$ begin
  create type public.group_privacy as enum ('public','private');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.group_role as enum ('admin','member');
exception when duplicate_object then null; end $$;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  emoji text,
  privacy public.group_privacy not null default 'public',
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.challenges add column if not exists group_id uuid references public.groups(id) on delete set null;
create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists groups_created_by_idx on public.groups(created_by);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_group_created_idx on public.messages(group_id,created_at desc);
create index if not exists challenges_group_id_idx on public.challenges(group_id);

create or replace function private.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p_user_id); $$;
create or replace function private.is_group_creator(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $ select exists(select 1 from public.groups g where g.id=p_group_id and g.created_by=p_user_id); $;
revoke execute on function private.is_group_creator(uuid,uuid) from public,anon;
grant execute on function private.is_group_creator(uuid,uuid) to authenticated;

create or replace function private.is_group_admin(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p_user_id and gm.role='admin'::public.group_role); $$;
revoke execute on function private.is_group_member(uuid,uuid) from public,anon;
revoke execute on function private.is_group_admin(uuid,uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.is_group_member(uuid,uuid) to authenticated;
grant execute on function private.is_group_admin(uuid,uuid) to authenticated;

create or replace function public.join_group_by_invite_code(p_invite_code text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_group_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select g.id into v_group_id from public.groups g where upper(g.invite_code)=upper(btrim(p_invite_code)) limit 1;
  if v_group_id is null then raise exception 'Invalid invite code'; end if;
  insert into public.group_members(group_id,user_id,role)
  values(v_group_id,(select auth.uid()),'member'::public.group_role)
  on conflict(group_id,user_id) do nothing;
  return v_group_id;
end;
$$;
revoke execute on function public.join_group_by_invite_code(text) from public,anon;
grant execute on function public.join_group_by_invite_code(text) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "groups: read" on public.groups;
drop policy if exists "groups: insert" on public.groups;
drop policy if exists "groups: update" on public.groups;
drop policy if exists "groups: delete" on public.groups;
create policy "groups: read" on public.groups for select to authenticated using (privacy='public'::public.group_privacy or (select private.is_group_member(id)));
create policy "groups: insert" on public.groups for insert to authenticated with check ((select auth.uid())=created_by);
create policy "groups: update" on public.groups for update to authenticated using ((select private.is_group_admin(id))) with check ((select private.is_group_admin(id)));
create policy "groups: delete" on public.groups for delete to authenticated using ((select auth.uid())=created_by);

drop policy if exists "group_members: read" on public.group_members;
drop policy if exists "group_members: insert" on public.group_members;
drop policy if exists "group_members: delete" on public.group_members;
create policy "group_members: read" on public.group_members for select to authenticated using ((select private.is_group_member(group_id)));
create policy "group_members: insert" on public.group_members for insert to authenticated with check ((select auth.uid())=user_id and ((select private.is_group_creator(group_id)) or exists(select 1 from public.groups g where g.id=group_id and g.privacy='public'::public.group_privacy)));
create policy "group_members: delete" on public.group_members for delete to authenticated using (user_id<>(select auth.uid()) and (select private.is_group_admin(group_id)));

drop policy if exists "messages: read" on public.messages;
drop policy if exists "messages: insert" on public.messages;
drop policy if exists "messages: update" on public.messages;
create policy "messages: read" on public.messages for select to authenticated using ((select private.is_group_member(group_id)));
create policy "messages: insert" on public.messages for insert to authenticated with check (sender_id=(select auth.uid()) and (select private.is_group_member(group_id)));
create policy "messages: update" on public.messages for update to authenticated using ((select private.is_group_admin(group_id))) with check ((select private.is_group_admin(group_id)));

drop policy if exists "challenges: read" on public.challenges;
create policy "challenges: read" on public.challenges for select to authenticated using (visibility=any(array['public'::text,'invite'::text]) or creator_id=(select auth.uid()) or id in(select private.user_challenge_ids()) or (group_id is not null and (select private.is_group_member(group_id))));
drop policy if exists "challenges: insert" on public.challenges;
create policy "challenges: insert" on public.challenges for insert to authenticated with check ((select auth.uid())=creator_id and (group_id is null or (select private.is_group_member(group_id))));
drop policy if exists "challenges: update" on public.challenges;
create policy "challenges: update" on public.challenges for update to authenticated using ((select auth.uid())=creator_id) with check ((select auth.uid())=creator_id and (group_id is null or (select private.is_group_member(group_id))));

drop policy if exists "challenge_members: read" on public.challenge_members;
create policy "challenge_members: read" on public.challenge_members for select to authenticated using (user_id=(select auth.uid()) or challenge_id in(select private.user_created_challenge_ids()) or challenge_id in(select c.id from public.challenges c where c.group_id is not null and (select private.is_group_member(c.group_id))) or challenge_id in(select c.id from public.challenges c where c.visibility='public'::text));

do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
