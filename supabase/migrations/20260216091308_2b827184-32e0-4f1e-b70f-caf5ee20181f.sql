
-- Function to reset refused_by when all moderators have refused a task
CREATE OR REPLACE FUNCTION public.recycle_fully_refused_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moderator_count int;
BEGIN
  -- Count total moderators/admins
  SELECT COUNT(*) INTO moderator_count FROM moderator_permissions;
  
  -- If no moderators found, use a fallback of 1 to avoid infinite stuck
  IF moderator_count = 0 THEN
    moderator_count := 1;
  END IF;

  -- Reset refused_by for pending tasks where everyone has refused
  UPDATE moderation_tasks
  SET refused_by = '{}'::text[], updated_at = now()
  WHERE status = 'pending'
    AND refused_by IS NOT NULL
    AND array_length(refused_by, 1) >= moderator_count;
END;
$$;
