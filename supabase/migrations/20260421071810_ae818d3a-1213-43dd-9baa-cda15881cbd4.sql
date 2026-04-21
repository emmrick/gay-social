-- Add priority scoring and offering tracking to moderation_tasks
ALTER TABLE public.moderation_tasks
  ADD COLUMN IF NOT EXISTS priority_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_resent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offered_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_moderation_tasks_priority 
  ON public.moderation_tasks (priority_score DESC, created_at ASC) 
  WHERE status = 'pending';

-- Function to compute priority based on age + type + refusals
CREATE OR REPLACE FUNCTION public.compute_task_priority(
  _created_at TIMESTAMPTZ,
  _task_type TEXT,
  _refused_count INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  age_minutes INTEGER;
  type_weight INTEGER;
  base_score INTEGER;
BEGIN
  age_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - _created_at))::INTEGER / 60);
  
  -- Type weights: support is highest priority (live user waiting)
  type_weight := CASE _task_type
    WHEN 'support_chat' THEN 100
    WHEN 'identity_verification' THEN 50
    WHEN 'screenshot_investigation' THEN 80
    WHEN 'report_review' THEN 40
    WHEN 'ai_moderation' THEN 60
    ELSE 20
  END;
  
  -- Score = type weight + age boost + refusal penalty
  base_score := type_weight + (age_minutes * 2) + (COALESCE(_refused_count, 0) * 10);
  
  RETURN base_score;
END;
$$;

-- Trigger to auto-update priority on insert/update
CREATE OR REPLACE FUNCTION public.update_task_priority_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.priority_score := public.compute_task_priority(
    NEW.created_at,
    NEW.task_type,
    COALESCE(array_length(NEW.refused_by, 1), 0)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_task_priority ON public.moderation_tasks;
CREATE TRIGGER trg_update_task_priority
  BEFORE INSERT OR UPDATE OF refused_by, status ON public.moderation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_priority_score();

-- Backfill existing rows
UPDATE public.moderation_tasks
SET priority_score = public.compute_task_priority(
  created_at,
  task_type,
  COALESCE(array_length(refused_by, 1), 0)
)
WHERE status = 'pending';

-- RPC to get tasks needing SMS re-notification (>15min stale)
CREATE OR REPLACE FUNCTION public.get_stale_tasks_for_resms()
RETURNS TABLE(id UUID, task_type TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, task_type, created_at
  FROM public.moderation_tasks
  WHERE status = 'pending'
    AND created_at < now() - interval '15 minutes'
    AND (sms_resent_at IS NULL OR sms_resent_at < now() - interval '20 minutes')
  ORDER BY priority_score DESC
  LIMIT 20;
$$;