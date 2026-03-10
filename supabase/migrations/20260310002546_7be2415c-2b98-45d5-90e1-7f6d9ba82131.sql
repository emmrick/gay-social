
-- Update get_exclusive_next_task to use 60s TTL instead of 90s
CREATE OR REPLACE FUNCTION public.get_exclusive_next_task(_user_id uuid, _offer_ttl_seconds integer DEFAULT 60)
RETURNS SETOF moderation_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _task RECORD;
BEGIN
  -- First, check if this user already has an active offer
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

  -- Find the next available pending task
  SELECT * INTO _task
  FROM public.moderation_tasks
  WHERE status = 'pending'
    AND NOT (_user_id = ANY(COALESCE(refused_by, '{}')))
    AND (
      offered_to IS NULL 
      OR offered_to = _user_id
      OR offered_at <= now() - (_offer_ttl_seconds || ' seconds')::interval
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

-- Create function to notify moderators on new task creation
CREATE OR REPLACE FUNCTION public.notify_moderators_new_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _mod RECORD;
BEGIN
  -- Send push notification to all moderators/admins
  FOR _mod IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role IN ('admin', 'moderator')
  LOOP
    -- Create in-app notification
    INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read)
    VALUES (
      _mod.user_id,
      'system',
      '🔔 Nouvelle mission disponible',
      COALESCE(NEW.description, 'Une nouvelle mission de modération est en attente.'),
      '/admin',
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new task notifications
DROP TRIGGER IF EXISTS trigger_notify_moderators_new_task ON public.moderation_tasks;
CREATE TRIGGER trigger_notify_moderators_new_task
  AFTER INSERT ON public.moderation_tasks
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_moderators_new_task();
