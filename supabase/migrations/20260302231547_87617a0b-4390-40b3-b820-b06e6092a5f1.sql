
-- Function to put a support task on hold with half payment
CREATE OR REPLACE FUNCTION public.hold_support_task(_task_id UUID, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _task RECORD;
  _half_reward INTEGER;
BEGIN
  -- Complete the task
  UPDATE public.moderation_tasks
  SET status = 'completed',
      completed_by = _user_id,
      completed_at = now(),
      updated_at = now()
  WHERE id = _task_id
    AND reserved_by = _user_id
    AND status = 'reserved'
  RETURNING * INTO _task;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tâche introuvable ou non réservée par vous.');
  END IF;

  _half_reward := GREATEST((_task.reward_cents / 2), 1);

  RETURN jsonb_build_object('success', true, 'task_id', _task.id, 'reward_cents', _half_reward);
END;
$$;
