CREATE OR REPLACE FUNCTION public.filter_suspended_or_blocked_users(_user_ids uuid[])
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT ub.user_id), ARRAY[]::uuid[])
  FROM public.user_blocks ub
  WHERE ub.user_id = ANY(_user_ids)
    AND ub.is_active = true
    AND (
      ub.suspension_type = 'permanent'
      OR (ub.suspension_type = 'temporary' AND (ub.suspension_ends_at IS NULL OR ub.suspension_ends_at > now()))
    )
$function$;

GRANT EXECUTE ON FUNCTION public.filter_suspended_or_blocked_users(uuid[]) TO authenticated, anon;