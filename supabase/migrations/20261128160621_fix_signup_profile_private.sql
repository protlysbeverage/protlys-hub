-- Repair signup profile persistence after the profile_private email field was
-- introduced in handle_new_user without being added to the live table.
ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profile_private pp
SET email = u.email
FROM auth.users u
WHERE u.id = pp.user_id
  AND pp.email IS NULL;

ALTER TABLE public.profile_private
  ALTER COLUMN email SET NOT NULL;

-- Keep age-of-majority validation and persist the date of birth privately.
-- Preserve profile creation, referral attribution, and Founding 250 auto-join.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  display_name_text text;
  city_text text;
  referral_input text;
  referrer_id uuid;
  referral_code_text text;
  dob_text text;
  dob date;
BEGIN
  display_name_text := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Protlys member'
  );

  city_text := nullif(btrim(new.raw_user_meta_data->>'city'), '');
  referral_input := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  dob_text := nullif(btrim(new.raw_user_meta_data->>'date_of_birth'), '');

  IF dob_text IS NULL THEN
    RAISE EXCEPTION 'DATE_OF_BIRTH_REQUIRED';
  END IF;

  BEGIN
    dob := dob_text::date;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'INVALID_DATE_OF_BIRTH';
  END;

  IF dob > (current_date - interval '18 years')::date
     OR dob < (current_date - interval '120 years')::date THEN
    RAISE EXCEPTION 'AGE_RESTRICTION';
  END IF;

  IF city_text IS NOT NULL AND char_length(city_text) > 80 THEN
    RAISE EXCEPTION 'CITY_TOO_LONG';
  END IF;

  IF referral_input <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = referral_input AND id <> new.id
    LIMIT 1;
  END IF;

  LOOP
    referral_code_text := upper(substr(md5(random()::text || clock_timestamp()::text || new.id::text), 1, 10));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = referral_code_text
    );
  END LOOP;

  INSERT INTO public.profiles (id, display_name, city, referral_code, referred_by)
  VALUES (new.id, display_name_text, city_text, referral_code_text, referrer_id)
  ON CONFLICT (id) DO UPDATE
    SET display_name = excluded.display_name,
        city = coalesce(public.profiles.city, excluded.city),
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by = coalesce(public.profiles.referred_by, excluded.referred_by);

  INSERT INTO public.profile_private (user_id, email, date_of_birth)
  VALUES (new.id, new.email, dob)
  ON CONFLICT (user_id) DO UPDATE
    SET email = excluded.email,
        date_of_birth = coalesce(public.profile_private.date_of_birth, excluded.date_of_birth);

  PERFORM public.add_user_to_founding_250(new.id);
  RETURN new;
END;
$function$;
