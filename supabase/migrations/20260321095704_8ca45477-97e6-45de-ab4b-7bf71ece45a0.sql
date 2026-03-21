-- Make get_exclusive_next_task auto-recycle tasks refused by all moderators
CREATE OR REPLACE FUNCTION public.get_exclusive_next_task(_user_id uuid, _offer_ttl_seconds integer DEFAULT 60)
 RETURNS SETOF moderation_tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _task RECORD;
  _is_online BOOLEAN;
  _other_online_count INTEGER;
BEGIN
  -- Check if the requesting user is currently online
  SELECT (p.is_online = true AND p.last_seen > now() - interval '5 minutes')
  INTO _is_online
  FROM public.profiles p
  WHERE p.user_id = _user_id;

  IF NOT COALESCE(_is_online, false) THEN
    RETURN;
  END IF;

  -- Auto-recycle tasks that have been refused by ALL moderators
  PERFORM public.recycle_fully_refused_tasks();

  -- Check if this user already has an active (non-expired) offer
  SELECT * INTO _task
  FROM public.moderation_tasks
  WHERE offered_to = _user_id
    AND status = 'pending'
    AND offered_at > now() - (_offer_ttl_seconds || ' seconds')::interval
  LIMIT 1;

  IF FOUND THEN
    RETURN NEXT _task;
    RETURN;
  END IF;

  -- Auto-refuse expired offers
  UPDATE public.moderation_tasks
  SET refused_by = array_append(COALESCE(refused_by, '{}'::uuid[]), offered_to),
      offered_to = NULL,
      offered_at = NULL,
      updated_at = now()
  WHERE status = 'pending'
    AND offered_to IS NOT NULL
    AND offered_at <= now() - (_offer_ttl_seconds || ' seconds')::interval;

  -- Find next available pending task (oldest first)
  SELECT * INTO _task
  FROM public.moderation_tasks
  WHERE status = 'pending'
    AND NOT (_user_id = ANY(COALESCE(refused_by, '{}'::uuid[])))
    AND (offered_to IS NULL)
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Count other online moderators who haven't refused this task
  SELECT COUNT(*) INTO _other_online_count
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role IN ('admin', 'moderator')
    AND p.user_id != _user_id
    AND p.is_online = true
    AND p.last_seen > now() - interval '5 minutes'
    AND NOT (p.user_id = ANY(COALESCE(_task.refused_by, '{}'::uuid[])));

  -- For tasks pending > 90s without any offer, always offer immediately
  IF _other_online_count > 0 AND _task.created_at > now() - interval '90 seconds' THEN
    IF random() > (1.0 / (_other_online_count + 1)) THEN
      RETURN;
    END IF;
  END IF;

  -- Atomically assign the offer
  UPDATE public.moderation_tasks
  SET offered_to = _user_id,
      offered_at = now(),
      updated_at = now()
  WHERE id = _task.id;

  _task.offered_to := _user_id;
  _task.offered_at := now();

  RETURN NEXT _task;
  RETURN;
END;
$function$;