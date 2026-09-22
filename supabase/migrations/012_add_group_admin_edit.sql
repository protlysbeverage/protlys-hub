alter table public.groups add column if not exists image_url text;
insert into storage.buckets (id,name,public) values ('group-avatars','group-avatars',true) on conflict (id) do update set public=true;
drop policy if exists "group avatars read" on storage.objects;
drop policy if exists "group avatars insert" on storage.objects;
drop policy if exists "group avatars update" on storage.objects;
create policy "group avatars read" on storage.objects for select to public using (bucket_id='group-avatars');
create policy "group avatars insert" on storage.objects for insert to authenticated with check (bucket_id='group-avatars' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "group avatars update" on storage.objects for update to authenticated using (bucket_id='group-avatars' and (storage.foldername(name))[1]=(select auth.uid()::text)) with check (bucket_id='group-avatars' and (storage.foldername(name))[1]=(select auth.uid()::text));
create or replace function public.update_group_details(p_group_id uuid,p_name text,p_emoji text,p_privacy public.group_privacy,p_image_url text default null)
returns public.groups language plpgsql security definer set search_path=''
as $$
declare v_group public.groups;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if not (select private.is_group_admin(p_group_id)) then raise exception 'Only group admins can edit group details'; end if;
 update public.groups set name=btrim(p_name),emoji=nullif(btrim(coalesce(p_emoji,'')),''),privacy=p_privacy,image_url=nullif(btrim(coalesce(p_image_url,'')),'') where id=p_group_id returning * into v_group;
 if v_group.id is null then raise exception 'Group not found'; end if;
 return v_group;
end; $$;
revoke execute on function public.update_group_details(uuid,text,text,public.group_privacy,text) from public,anon;
grant execute on function public.update_group_details(uuid,text,text,public.group_privacy,text) to authenticated;
alter table public.messages add column if not exists image_url text;
insert into storage.buckets (id,name,public) values ('group-media','group-media',true) on conflict (id) do update set public=true;
drop policy if exists "Group media public read" on storage.objects;
drop policy if exists "Group media member upload" on storage.objects;
create policy "Group media public read" on storage.objects for select to public using (bucket_id='group-media');
create policy "Group media member upload" on storage.objects for insert to authenticated with check (bucket_id='group-media' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists "challenges: delete" on public.challenges;
create policy "challenges: delete" on public.challenges for delete to authenticated using ((select auth.uid())=creator_id);
