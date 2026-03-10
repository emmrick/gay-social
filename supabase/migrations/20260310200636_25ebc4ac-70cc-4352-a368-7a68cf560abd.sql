
CREATE OR REPLACE FUNCTION public.get_exclusive_next_task(_user_id uuid, _offer_ttl_seconds integer DEFAULT 60)
 RETURNS SETOF moderation_tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _task RECORD;
  _is_online BOOLEAN;
BEGIN
  -- Check if the requesting user is currently online (active within last 5 minutes)
  SELECT (p.is_online = true AND p.last_seen > now() - interval '5 minutes')
  INTO _is_online
  FROM public.profiles p
  WHERE p.user_id = _user_id;

  -- If user is not online, don't offer any task
  IF NOT COALESCE(_is_online, false) THEN
    RETURN;
  END IF;

  -- First, check if this user already has an active (non-expired) offer
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

  -- Auto-refuse expired offers: if a task was offered to someone and they let it expire,
  -- add them to refused_by so they don't get it again
  UPDATE public.moderation_tasks
  SET refused_by = array_append(COALESCE(refused_by, '{}'), offered_to::text),
      offered_to = NULL,
      offered_at = NULL,
      updated_at = now()
  WHERE status = 'pending'
    AND offered_to IS NOT NULL
    AND offered_at <= now() - (_offer_ttl_seconds || ' seconds')::interval;

  -- Find the next available pending task (excluding this user if they already refused/expired)
  SELECT * INTO _task
  FROM public.moderation_tasks
  WHERE status = 'pending'
    AND NOT (_user_id::text = ANY(COALESCE(refused_by, '{}')))
    AND (
      offered_to IS NULL 
      OR offered_to = _user_id
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Atomically assign the offer to this user
  UPDATE public.moderation_tasks
  SET offered_to = _user_id,
      offered_at = now()
  WHERE id = _task.id;

  _task.offered_to := _user_id;
  _task.offered_at := now();

  RETURN NEXT _task;
  RETURN;
END;
$function$;
