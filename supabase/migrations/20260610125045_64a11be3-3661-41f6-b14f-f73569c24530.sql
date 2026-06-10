CREATE OR REPLACE FUNCTION public.report_profile_photo(
  _reported_user_id uuid,
  _description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _reporter uuid := auth.uid();
  _report_id uuid;
  _username text;
  _rate_cents integer;
BEGIN
  IF _reporter IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _reported_user_id IS NULL OR _reported_user_id = _reporter THEN
    RAISE EXCEPTION 'Invalid target';
  END IF;

  -- Anti-abus : un seul signalement photo par jour par cible
  IF EXISTS (
    SELECT 1 FROM public.reports
    WHERE reporter_id = _reporter
      AND reported_user_id = _reported_user_id
      AND reason = 'inappropriate_content'
      AND (metadata->>'type') = 'profile_photo'
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'Already reported recently' USING ERRCODE = '23505';
  END IF;

  SELECT username INTO _username FROM public.profiles WHERE user_id = _reported_user_id;

  -- 1. Créer le signalement
  INSERT INTO public.reports (
    reporter_id, reported_user_id, reason, description, metadata, status
  ) VALUES (
    _reporter,
    _reported_user_id,
    'inappropriate_content',
    coalesce(nullif(trim(_description), ''), 'Signalement de la photo de profil'),
    jsonb_build_object('type', 'profile_photo'),
    'pending'
  ) RETURNING id INTO _report_id;

  -- 2. Marquer toutes les photos de profil comme retirées
  UPDATE public.profile_photos
  SET status = 'rejected',
      rejection_reason = 'Retirée suite à un signalement de la communauté'
  WHERE user_id = _reported_user_id
    AND status <> 'rejected';

  -- 3. Effacer l'avatar du profil
  UPDATE public.profiles
  SET avatar_url = NULL
  WHERE user_id = _reported_user_id;

  -- 4. Notifier l'utilisateur signalé
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url, is_read)
  VALUES (
    _reported_user_id,
    'system',
    'Photo de profil retirée',
    'L''équipe technique a retiré votre photo de profil suite à un signalement. Merci d''ajouter une nouvelle photo conforme aux règles pour continuer à utiliser le site.',
    jsonb_build_object('reason', 'reported_profile_photo'),
    '/profile?edit=true',
    false
  );

  -- 5. Créer une mission de modération pour examen
  SELECT rate_cents INTO _rate_cents FROM public.task_rates WHERE task_type = 'content_moderation' AND is_active = true;
  INSERT INTO public.moderation_tasks (task_type, target_entity_id, target_user_id, reward_cents, description, metadata)
  VALUES (
    'content_moderation',
    _report_id,
    _reported_user_id,
    COALESCE(_rate_cents, 5),
    'Photo de profil signalée par la communauté' || COALESCE(' (' || _username || ')', ''),
    jsonb_build_object('type', 'reported_profile_photo', 'report_id', _report_id, 'username', _username)
  );

  RETURN _report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_profile_photo(uuid, text) TO authenticated;