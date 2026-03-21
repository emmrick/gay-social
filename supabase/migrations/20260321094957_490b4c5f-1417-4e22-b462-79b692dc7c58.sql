-- Remove ambiguous overload that breaks PostgREST RPC resolution
DROP FUNCTION IF EXISTS public.get_exclusive_next_task(uuid);

-- Fix refused_by type handling when recycling tasks refused by all moderators
CREATE OR REPLACE FUNCTION public.recycle_fully_refused_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moderator_count integer;
BEGIN
  SELECT COUNT(*)
  INTO moderator_count
  FROM public.user_roles
  WHERE role = 'moderator';

  IF moderator_count = 0 THEN
    RETURN;
  END IF;

  UPDATE public.moderation_tasks mt
  SET
    status = 'pending',
    offered_to = NULL,
    offered_at = NULL,
    reserved_by = NULL,
    reserved_at = NULL,
    refused_by = ARRAY[]::uuid[],
    updated_at = now()
  WHERE mt.status = 'pending'
    AND COALESCE(array_length(mt.refused_by, 1), 0) >= moderator_count;
END;
$$;