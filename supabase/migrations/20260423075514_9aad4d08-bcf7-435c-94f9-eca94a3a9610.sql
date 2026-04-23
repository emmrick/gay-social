
-- Table pour stocker les périodes de masquage de localisation
CREATE TABLE public.location_hide_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_currently_hidden boolean NOT NULL DEFAULT true,
  last_paused_at timestamptz NULL,
  remaining_seconds_when_paused integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.location_hide_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location hide period"
ON public.location_hide_periods FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own location hide period"
ON public.location_hide_periods FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all location hide periods"
ON public.location_hide_periods FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_location_hide_periods_updated_at
BEFORE UPDATE ON public.location_hide_periods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Récupère le statut courant
CREATE OR REPLACE FUNCTION public.get_location_hide_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.location_hide_periods%ROWTYPE;
  _remaining_seconds integer := 0;
  _is_active boolean := false;
BEGIN
  SELECT * INTO _row FROM public.location_hide_periods WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_period', false,
      'is_hidden', false,
      'remaining_seconds', 0,
      'expires_at', null
    );
  END IF;

  IF _row.is_currently_hidden THEN
    -- Compte le temps restant jusqu'à expires_at
    _remaining_seconds := GREATEST(0, EXTRACT(EPOCH FROM (_row.expires_at - now()))::integer);
    _is_active := _remaining_seconds > 0;
  ELSE
    -- En pause : on a stocké le temps restant
    _remaining_seconds := COALESCE(_row.remaining_seconds_when_paused, 0);
    _is_active := false;
  END IF;

  RETURN jsonb_build_object(
    'has_period', _remaining_seconds > 0,
    'is_hidden', _is_active,
    'remaining_seconds', _remaining_seconds,
    'expires_at', _row.expires_at
  );
END;
$$;

-- Achète 24h de masquage (30 crédits)
CREATE OR REPLACE FUNCTION public.purchase_location_hide(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.location_hide_periods%ROWTYPE;
  _remaining_seconds integer := 0;
  _deduct json;
  _cost numeric := 30;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  SELECT * INTO _existing FROM public.location_hide_periods WHERE user_id = _user_id;

  IF FOUND THEN
    IF _existing.is_currently_hidden THEN
      _remaining_seconds := GREATEST(0, EXTRACT(EPOCH FROM (_existing.expires_at - now()))::integer);
    ELSE
      _remaining_seconds := COALESCE(_existing.remaining_seconds_when_paused, 0);
    END IF;

    IF _remaining_seconds > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Vous avez encore du temps de masquage. Activez-le plutôt que de racheter.',
        'remaining_seconds', _remaining_seconds
      );
    END IF;
  END IF;

  -- Débite les crédits
  SELECT public.deduct_credits(
    _user_id := _user_id,
    _amount := _cost,
    _transaction_type := 'location_hide',
    _description := 'Masquage de la position (24h)'
  ) INTO _deduct;

  IF NOT COALESCE((_deduct->>'success')::boolean, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(_deduct->>'error', 'Crédits insuffisants'),
      'required', _cost
    );
  END IF;

  -- Crée ou remplace la période
  INSERT INTO public.location_hide_periods (
    user_id, purchased_at, expires_at, is_currently_hidden,
    last_paused_at, remaining_seconds_when_paused
  )
  VALUES (
    _user_id, now(), now() + interval '24 hours', true, NULL, NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    purchased_at = now(),
    expires_at = now() + interval '24 hours',
    is_currently_hidden = true,
    last_paused_at = NULL,
    remaining_seconds_when_paused = NULL,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'cost', _cost,
    'expires_at', now() + interval '24 hours',
    'remaining_seconds', 86400
  );
END;
$$;

-- Active/désactive le masquage (sans recharger les crédits)
CREATE OR REPLACE FUNCTION public.toggle_location_visibility(_user_id uuid, _hide boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.location_hide_periods%ROWTYPE;
  _remaining integer := 0;
  _new_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  SELECT * INTO _row FROM public.location_hide_periods WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune période active. Achetez d''abord.');
  END IF;

  IF _hide THEN
    -- Réactiver le masquage : utiliser le temps restant en pause
    IF _row.is_currently_hidden THEN
      RETURN jsonb_build_object('success', true, 'is_hidden', true, 'remaining_seconds',
        GREATEST(0, EXTRACT(EPOCH FROM (_row.expires_at - now()))::integer));
    END IF;

    _remaining := COALESCE(_row.remaining_seconds_when_paused, 0);
    IF _remaining <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Temps écoulé. Veuillez racheter une période.');
    END IF;

    _new_expires := now() + (_remaining || ' seconds')::interval;

    UPDATE public.location_hide_periods
    SET is_currently_hidden = true,
        expires_at = _new_expires,
        last_paused_at = NULL,
        remaining_seconds_when_paused = NULL,
        updated_at = now()
    WHERE user_id = _user_id;

    RETURN jsonb_build_object('success', true, 'is_hidden', true, 'remaining_seconds', _remaining);
  ELSE
    -- Mettre en pause : stocker le temps restant
    IF NOT _row.is_currently_hidden THEN
      RETURN jsonb_build_object('success', true, 'is_hidden', false,
        'remaining_seconds', COALESCE(_row.remaining_seconds_when_paused, 0));
    END IF;

    _remaining := GREATEST(0, EXTRACT(EPOCH FROM (_row.expires_at - now()))::integer);

    UPDATE public.location_hide_periods
    SET is_currently_hidden = false,
        last_paused_at = now(),
        remaining_seconds_when_paused = _remaining,
        updated_at = now()
    WHERE user_id = _user_id;

    RETURN jsonb_build_object('success', true, 'is_hidden', false, 'remaining_seconds', _remaining);
  END IF;
END;
$$;

-- Met à jour get_nearby_profiles pour exclure les profils masqués
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(user_lat double precision, user_lon double precision, max_distance_km double precision DEFAULT 50000, limit_count integer DEFAULT 1000)
RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, bio text, age integer, is_online boolean, last_seen timestamp with time zone, region text, distance_km double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.username,
    COALESCE(p.avatar_url, (
      SELECT pp.photo_url FROM public.profile_photos pp
      WHERE pp.user_id = p.user_id AND pp.is_primary = true
      LIMIT 1
    ), (
      SELECT pp2.photo_url FROM public.profile_photos pp2
      WHERE pp2.user_id = p.user_id
      ORDER BY pp2.display_order ASC
      LIMIT 1
    )) as avatar_url,
    p.bio,
    p.age,
    p.is_online,
    p.last_seen,
    p.region,
    public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) as distance_km
  FROM public.profiles p
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.user_id != auth.uid()
    AND public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) <= max_distance_km
    AND NOT public.is_user_blocked(p.user_id)
    AND NOT public.is_user_suspended(p.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.location_hide_periods lhp
      WHERE lhp.user_id = p.user_id
        AND lhp.is_currently_hidden = true
        AND lhp.expires_at > now()
    )
  ORDER BY
    public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) ASC
  LIMIT limit_count;
END;
$function$;
