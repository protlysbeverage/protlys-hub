-- ============================================================
-- PROTLYS HUB — MIGRATION 007
-- Public member identity + real names + profile join dates
-- ============================================================

-- The feed joins posts/comments to profiles. The original profiles
-- policy allowed each member to read only their own profile, which
-- caused other users' names/avatar data to come back as null.
-- Allow the community to read public profile fields.
create policy "profiles: public community read"
on public.profiles
for select
using (true);

-- Google OAuth commonly stores the user's name as full_name or name
-- rather than display_name. Backfill existing profiles.
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

-- Keep names and avatars populated for future sign-ups.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
aS $$
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

-- Re-attach the existing auth trigger so the function is used for new users.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
