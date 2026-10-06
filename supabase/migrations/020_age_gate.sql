-- Protlys Hub: enforce an 18+ age gate for new accounts.
alter table public.profiles
  add column if not exists date_of_birth date;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dob date;
  dob_text text;
begin
  dob_text := new.raw_user_meta_data->>'date_of_birth';

  if dob_text is null or dob_text = '' then
    raise exception 'DATE_OF_BIRTH_REQUIRED';
  end if;

  begin
    dob := dob_text::date;
  exception when others then
    raise exception 'INVALID_DATE_OF_BIRTH';
  end;

  if dob > (current_date - interval '18 years')::date
     or dob < (current_date - interval '120 years')::date then
    raise exception 'AGE_RESTRICTION';
  end if;

  insert into public.profiles (id, display_name, date_of_birth)
  values (new.id, new.raw_user_meta_data->>'display_name', dob)
  on conflict (id) do update
    set display_name = excluded.display_name,
        date_of_birth = coalesce(public.profiles.date_of_birth, excluded.date_of_birth);

  return new;
end;
$$;