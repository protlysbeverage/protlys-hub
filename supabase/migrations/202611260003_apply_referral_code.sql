-- Apply a referral to a newly created account after email confirmation or immediate sign-in.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_created_at timestamptz;
  v_updated integer := 0;
BEGIN
  IF v_user_id IS NULL OR p_code IS NULL OR length(trim(p_code)) < 4 OR length(trim(p_code)) > 32 THEN
    RETURN false;
  END IF;

  SELECT created_at INTO v_created_at
  FROM auth.users
  WHERE id = v_user_id;

  -- Only attribute a recent account, so an existing member cannot claim a
  -- referral after the fact.
  IF v_created_at IS NULL OR v_created_at < now() - interval '30 days' THEN
    RETURN false;
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = upper(trim(p_code))
    AND id <> v_user_id
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET referred_by = v_referrer_id
  WHERE id = v_user_id AND referred_by IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
