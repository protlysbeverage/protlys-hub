-- Challenge management: creators and explicitly listed admins may edit/delete.
-- Founding 250 is intentionally locked, including for admins.

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;

create policy "admin users read own role" on private.admin_users
for select to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema private to authenticated;
grant select on private.admin_users to authenticated;

-- Admin status is derived from a private allowlist. The function is SECURITY
-- INVOKER so the caller can only read their own row through the policy above.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

-- The current Protlys Hub admin account, display name "H I M".
insert into private.admin_users (user_id)
values ('069c3255-254c-4b34-b4fd-a97f54001767'::uuid)
on conflict (user_id) do nothing;

-- Admins can see private challenges too, so they can manage every challenge.
drop policy if exists "challenges: read" on public.challenges;
create policy "challenges: read" on public.challenges
for select to authenticated
using (
  (select public.is_current_user_admin())
  or visibility = any (array['public'::text, 'invite'::text])
  or creator_id = (select auth.uid())
  or id in (select private.user_challenge_ids())
  or ((group_id is not null) and (select private.is_group_member(group_id)))
);

drop policy if exists "challenges: update" on public.challenges;
create policy "challenges: update" on public.challenges
for update to authenticated
using (
  lower(btrim(name)) <> 'founding 250'
  and (
    (select auth.uid()) = creator_id
    or (select public.is_current_user_admin())
  )
)
with check (
  lower(btrim(name)) <> 'founding 250'
  and (
    (select public.is_current_user_admin())
    or (
      (select auth.uid()) = creator_id
      and ((group_id is null) or (select private.is_group_member(group_id)))
    )
  )
);

drop policy if exists "challenges: delete" on public.challenges;
create policy "challenges: delete" on public.challenges
for delete to authenticated
using (
  lower(btrim(name)) <> 'founding 250'
  and (
    (select auth.uid()) = creator_id
    or (select public.is_current_user_admin())
  )
);
