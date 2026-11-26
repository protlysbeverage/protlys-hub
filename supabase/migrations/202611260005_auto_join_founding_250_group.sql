-- Automatically place all existing and future profiles in the Founding 250 leaderboard group.
CREATE OR REPLACE FUNCTION public.add_user_to_founding_250(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE name = 'Founding 250'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (v_group_id, p_user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_founding_250_group_member()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM public.add_user_to_founding_250(auth.uid());
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.add_user_to_founding_250(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_founding_250_group_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_founding_250_group_member() TO authenticated;

-- Existing members are included in the same Founding 250 leaderboard group.
INSERT INTO public.group_members (group_id, user_id)
SELECT g.id, p.id
FROM public.groups g
CROSS JOIN public.profiles p
WHERE g.name = 'Founding 250'
ON CONFLICT (group_id, user_id) DO NOTHING;

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
BEGIN
  display_name_text := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Protlys member'
  );
  city_text := nullif(new.raw_user_meta_data->>'city', '');
  referral_input := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')));

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

  INSERT INTO public.profile_private (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO UPDATE SET email = excluded.email;

  PERFORM public.add_user_to_founding_250(new.id);
  RETURN new;
END;
$function$;
