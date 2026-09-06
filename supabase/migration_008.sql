-- ============================================================
-- PROTLYS HUB — MIGRATION 008
-- Ensure community profiles are readable and names are populated
-- ============================================================

-- The profile page and feed need to read public identity fields
-- (name, avatar and join date) for other community members.
-- Keep the owner's policy and add a public read policy safely.
drop policy if exists "profiles: public community read" on public.profiles;
create policy "profiles: public community read"
on public.profiles
for select
using (true);

-- Backfill missing display names from Supabase Auth metadata.
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

-- Make sure future sign-ups keep their real name and avatar.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
