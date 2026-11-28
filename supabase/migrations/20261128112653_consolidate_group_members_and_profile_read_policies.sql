drop policy if exists "group_members: delete" on public.group_members;
drop policy if exists "group_members: leave" on public.group_members;
create policy "group_members: delete" on public.group_members for delete to authenticated
using (
  user_id = (select auth.uid())
  or (
    user_id <> (select auth.uid())
    and (select private.is_group_admin(group_members.group_id))
  )
);

drop policy if exists "profiles: owner read" on public.profiles;
