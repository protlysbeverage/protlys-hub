-- Public member bio shown on Protlys Hub profiles.
alter table public.profiles
  add column if not exists bio text;

drop constraint if exists profiles_bio_length_check on public.profiles;

alter table public.profiles
  add constraint profiles_bio_length_check
  check (bio is null or char_length(bio) <= 240);
