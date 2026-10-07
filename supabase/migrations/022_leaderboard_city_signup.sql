alter table public.profiles add column if not exists city text;
alter table public.profiles drop constraint if exists profiles_city_length;
alter table public.profiles add constraint profiles_city_length check (city is null or char_length(btrim(city)) between 1 and 80);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dob date;
  dob_text text;
  city_text text;
begin
  dob_text := new.raw_user_meta_data->>'date_of_birth';
  city_text := nullif(btrim(new.raw_user_meta_data->>'city'), '');
  if dob_text is null or dob_text = '' then raise exception 'DATE_OF_BIRTH_REQUIRED'; end if;
  begin dob := dob_text::date; exception when others then raise exception 'INVALID_DATE_OF_BIRTH'; end;
  if dob > (current_date - interval '18 years')::date or dob < (current_date - interval '120 years')::date then raise exception 'AGE_RESTRICTION'; end if;
  if city_text is not null and char_length(city_text) > 80 then raise exception 'CITY_TOO_LONG'; end if;
  insert into public.profiles (id,display_name,date_of_birth,city)
  values (new.id,new.raw_user_meta_data->>'display_name',dob,city_text)
  on conflict (id) do update set
    display_name=excluded.display_name,
    date_of_birth=coalesce(public.profiles.date_of_birth,excluded.date_of_birth),
    city=coalesce(public.profiles.city,excluded.city);
  return new;
end;
$$;
