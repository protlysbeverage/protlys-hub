create or replace function public.update_group_details(p_group_id uuid, p_name text, p_emoji text, p_privacy public.group_privacy)
returns public.groups
language plpgsql
security definer
set search_path=''
as $$
declare v_group public.groups;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not (select private.is_group_admin(p_group_id)) then raise exception 'Only group admins can edit group details'; end if;
  update public.groups
  set name=btrim(p_name),
      emoji=nullif(btrim(coalesce(p_emoji,'')),''),
      privacy=p_privacy
  where id=p_group_id
  returning * into v_group;
  if v_group.id is null then raise exception 'Group not found'; end if;
  return v_group;
end;
$$;
revoke execute on function public.update_group_details(uuid,text,text,public.group_privacy) from public,anon;
grant execute on function public.update_group_details(uuid,text,text,public.group_privacy) to authenticated;
