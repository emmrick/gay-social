
-- Add exclusive offering columns to moderation_tasks
ALTER TABLE public.moderation_tasks 
  ADD COLUMN IF NOT EXISTS offered_to UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS offered_at TIMESTAMPTZ DEFAULT NULL;

-- Function to atomically offer the next task to ONE moderator exclusively
-- If a task is already offered to someone else (and not expired), skip it
CREATE OR REPLACE FUNCTION public.get_exclusive_next_task(_user_id UUID, _offer_ttl_seconds INTEGER DEFAULT 90)
RETURNS SETOF public.moderation_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Find the next available pending task:
  -- 1. Not refused by this user
  -- 2. Not currently offered to another user (or offer expired)
  -- 3. FIFO order
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
$$;

-- When a task is refused, clear the offer so it can be re-offered
CREATE OR REPLACE FUNCTION public.refuse_moderation_task(_task_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.moderation_tasks
  SET status = 'pending',
      reserved_by = NULL,
      reserved_at = NULL,
      offered_to = NULL,
      offered_at = NULL,
      refused_by = array_append(COALESCE(refused_by, '{}'), _user_id),
      updated_at = now()
  WHERE id = _task_id
    AND (reserved_by = _user_id OR offered_to = _user_id)
    AND status IN ('reserved', 'pending');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tâche introuvable ou non assignée à vous.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- When a task is reserved (accepted), clear the offer fields
CREATE OR REPLACE FUNCTION public.reserve_moderation_task(_task_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _task RECORD;
  _active_task RECORD;
BEGIN
  -- Check if user already has an active reserved task
  SELECT id INTO _active_task
  FROM public.moderation_tasks
  WHERE reserved_by = _user_id
    AND status = 'reserved'
    AND reserved_at > now() - interval '5 minutes'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà une tâche en cours.');
  END IF;

  -- Atomically reserve the task (must be offered to this user or pending)
  UPDATE public.moderation_tasks
  SET status = 'reserved',
      reserved_by = _user_id,
      reserved_at = now(),
      offered_to = NULL,
      offered_at = NULL,
      updated_at = now()
  WHERE id = _task_id
    AND status = 'pending'
    AND (offered_to = _user_id OR offered_to IS NULL)
    AND NOT (_user_id = ANY(COALESCE(refused_by, '{}')))
  RETURNING * INTO _task;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette tâche n''est plus disponible.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', _task.id,
    'task_type', _task.task_type,
    'target_entity_id', _task.target_entity_id,
    'reward_cents', _task.reward_cents
  );
END;
$$;

-- Also clear offers when expiring stale tasks
CREATE OR REPLACE FUNCTION public.expire_stale_moderation_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count INTEGER;
BEGIN
  -- Expire stale reserved tasks
  UPDATE public.moderation_tasks
  SET status = 'pending',
      reserved_by = NULL,
      reserved_at = NULL,
      offered_to = NULL,
      offered_at = NULL,
      updated_at = now()
  WHERE status = 'reserved'
    AND reserved_at < now() - interval '5 minutes';

  GET DIAGNOSTICS _count = ROW_COUNT;
  
  -- Also clear expired offers (so tasks aren't stuck)
  UPDATE public.moderation_tasks
  SET offered_to = NULL,
      offered_at = NULL
  WHERE status = 'pending'
    AND offered_to IS NOT NULL
    AND offered_at < now() - interval '90 seconds';

  RETURN _count;
END;
$$;
