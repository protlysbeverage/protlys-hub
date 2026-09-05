-- ============================================================
-- PROTLYS HUB — MIGRATION 007
-- Show real member names in community posts/comments
-- ============================================================

-- Google OAuth commonly stores the user's name as full_name or name
-- rather than display_name. Keep profiles.display_name populated so
-- feed posts/comments show the actual member name instead of "Member".

update public.profiles p
set display_name = coalesce(
  nullif(trim(p.display_name), ''),
  nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'name'), ''),
  nullif(trim(u.email), '')
)
from auth.users u
where p.id = u.id
  and (p.display_name is null or trim(p.display_name) = '');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.email), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data->>'picture'), '')
    )
  )
  on conflict (id) do update
    set display_name = coalesce(
      nullif(trim(public.profiles.display_name), ''),
      excluded.display_name
    ),
    avatar_url = coalesce(
      nullif(trim(public.profiles.avatar_url), ''),
      excluded.avatar_url
    );
  return new;
end;
$$;
