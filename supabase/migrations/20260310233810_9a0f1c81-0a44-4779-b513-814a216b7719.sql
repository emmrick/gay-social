
CREATE OR REPLACE FUNCTION public.get_estimated_wait_time(_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _task RECORD;
  _position INT;
  _online_mods INT;
  _avg_minutes NUMERIC;
  _estimated INT;
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
  SELECT COUNT(*) INTO _position
  FROM public.moderation_tasks
  WHERE status IN ('pending', 'reserved')
    AND created_at <= _task.created_at
    AND id != _task.id;

  _position := _position + 1; -- include self

  -- Count online moderators (is_online + last_seen within 5 min, must have moderator_permissions or admin role)
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

  -- Average minutes per task type
  _avg_minutes := CASE _task.task_type
    WHEN 'support_chat' THEN 5
    WHEN 'identity_verification' THEN 3
    WHEN 'report_review' THEN 4
    WHEN 'credit_management' THEN 2
    ELSE 4
  END;

  _estimated := CEIL((_position::numeric * _avg_minutes) / _online_mods::numeric);

  RETURN jsonb_build_object('position', _position, 'estimated_minutes', _estimated, 'online_moderators', _online_mods, 'found', true);
END;
$$;
