
-- 1) ADS: hide advertiser_email from anonymous visitors (column-level)
REVOKE SELECT (advertiser_email) ON public.ads FROM anon;

-- 2) ADVERTISER_PROMO_REDEMPTIONS: drop open public SELECT, add admin-only, expose existence-check RPC
DROP POLICY IF EXISTS "Anyone can read redemptions" ON public.advertiser_promo_redemptions;

CREATE POLICY "Admins can read redemptions" ON public.advertiser_promo_redemptions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE OR REPLACE FUNCTION public.has_advertiser_redeemed_promo(_code_id uuid, _advertiser_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.advertiser_promo_redemptions
    WHERE code_id = _code_id AND lower(advertiser_email) = lower(_advertiser_email)
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_advertiser_redeemed_promo(uuid, text) TO anon, authenticated;

-- 3) CONTACT_AGE_PREFERENCES: scope SELECT to owner only; expose check RPC
DROP POLICY IF EXISTS "Users can read any contact age preference" ON public.contact_age_preferences;

CREATE POLICY "Users can read their own preference" ON public.contact_age_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.can_contact_user_age(_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _pref RECORD;
  _my_age integer;
  _has_exception boolean;
BEGIN
  IF auth.uid() IS NULL OR _target_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  SELECT min_age, max_age INTO _pref
  FROM public.contact_age_preferences
  WHERE user_id = _target_user_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.contact_age_exceptions
    WHERE user_id = _target_user_id AND allowed_user_id = auth.uid()
  ) INTO _has_exception;

  IF _has_exception THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  SELECT age INTO _my_age FROM public.profiles WHERE user_id = auth.uid();
  IF _my_age IS NULL THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF _my_age BETWEEN _pref.min_age AND _pref.max_age THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'minAge', _pref.min_age, 'maxAge', _pref.max_age);
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_contact_user_age(uuid) TO authenticated;

-- 4) CREDIT_TRANSACTIONS: drop user-facing INSERT policy (writes happen via service role / SECURITY DEFINER funcs)
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.credit_transactions;

-- 5) NOTIFICATIONS: drop broadly-scoped INSERT policies and route through a validated RPC
DROP POLICY IF EXISTS "System can insert suggestion decision notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert tween notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.create_user_notification(
  _user_id uuid,
  _type text,
  _title text,
  _message text DEFAULT NULL,
  _data jsonb DEFAULT NULL,
  _action_url text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _allowed_types text[] := ARRAY[
    'system','new_favorite','photo_exchange_request','photo_exchange_response',
    'private_message','group_mention','album_access_request','album_access_granted',
    'album_access_refused','screenshot_attempt','story_new','story_view',
    'tween_new_post','tween_like','tween_comment','verification_request',
    'verification_required','suggestion_decision','profile_visit',
    'profile_reaction','match_new','plan_now_nearby'
  ];
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF NOT (_type = ANY(_allowed_types)) THEN
    RAISE EXCEPTION 'Invalid notification type: %', _type USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(_title, '')) > 200 THEN RAISE EXCEPTION 'Title too long'; END IF;
  IF length(coalesce(_message, '')) > 2000 THEN RAISE EXCEPTION 'Message too long'; END IF;

  INSERT INTO public.notifications(user_id, type, title, message, data, action_url, is_read)
  VALUES (_user_id, _type, _title, _message, _data, _action_url, false)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid, text, text, text, jsonb, text) TO authenticated;

-- 6) PROFILE_BOOSTS: restrict reads to authenticated, hide credits_spent column
DROP POLICY IF EXISTS "Anyone can read active boosts" ON public.profile_boosts;
CREATE POLICY "Authenticated can read active boosts" ON public.profile_boosts
  FOR SELECT TO authenticated
  USING (expires_at >= now());

REVOKE SELECT (credits_spent) ON public.profile_boosts FROM anon, authenticated;
GRANT SELECT (credits_spent) ON public.profile_boosts TO service_role;

-- 7) PLAN_NOW_SESSIONS: hide credits_spent from other users (column-level)
REVOKE SELECT (credits_spent) ON public.plan_now_sessions FROM anon, authenticated;
GRANT SELECT (credits_spent) ON public.plan_now_sessions TO service_role;
