
CREATE OR REPLACE FUNCTION public.get_estimated_wait_time(_entity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _task RECORD;
  _position INT;
  _online_mods INT;
  _estimated INT;
  _demands_ahead INT;
BEGIN
  -- Find the task linked to this entity
  SELECT * INTO _task
  FROM public.moderation_tasks
  WHERE target_entity_id = _entity_id
    AND status IN ('pending', 'reserved')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('position', 0, 'estimated_minutes', NULL, 'online_moderators', 0, 'found', false);
  END IF;

  -- Count tasks ahead in queue (pending or reserved, created before this one)
  SELECT COUNT(*) INTO _demands_ahead
  FROM public.moderation_tasks
  WHERE status IN ('pending', 'reserved')
    AND created_at <= _task.created_at
    AND id != _task.id;

  _position := _demands_ahead + 1; -- include self

  -- Count online moderators (is_online + last_seen within 5 min, must have moderator role)
  SELECT COUNT(DISTINCT p.user_id) INTO _online_mods
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role IN ('admin', 'moderator')
    AND p.is_online = true
    AND p.last_seen > now() - interval '5 minutes';

  -- If no moderators online, return null for estimated_minutes
  IF _online_mods = 0 THEN
    RETURN jsonb_build_object('position', _position, 'estimated_minutes', NULL, 'online_moderators', 0, 'found', true);
  END IF;

  -- Formula: base 2 minutes + 2 minutes per demand ahead
  _estimated := 2 + (_demands_ahead * 2);

  RETURN jsonb_build_object('position', _position, 'estimated_minutes', _estimated, 'online_moderators', _online_mods, 'found', true);
END;
$function$;
