-- 1. Cron job to clean stale online statuses server-side (was triggered by every client poll).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop any prior schedule with same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-stale-online-profiles');
EXCEPTION WHEN OTHERS THEN
  -- job didn't exist
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-stale-online-profiles',
  '* * * * *',
  $$ SELECT public.cleanup_stale_online_profiles(); $$
);

-- 2. Aggregated member counts RPC — replaces 3 separate client queries:
--    useTotalMemberCount, useOnlineMemberCount, useRegionMemberCounts/useOnlineMemberCounts.
CREATE OR REPLACE FUNCTION public.get_member_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_threshold timestamptz := now() - interval '5 minutes';
  total_count bigint;
  online_count bigint;
  per_region jsonb;
BEGIN
  SELECT count(*) INTO total_count FROM public.profiles;

  SELECT count(*) INTO online_count
  FROM public.profiles
  WHERE is_online = true
    AND last_seen >= recent_threshold;

  SELECT COALESCE(
    jsonb_object_agg(region, region_data),
    '{}'::jsonb
  ) INTO per_region
  FROM (
    SELECT
      p.region,
      jsonb_build_object(
        'total', count(*),
        'online', count(*) FILTER (WHERE p.is_online = true AND p.last_seen >= recent_threshold)
      ) AS region_data
    FROM public.profiles p
    WHERE p.region IS NOT NULL
    GROUP BY p.region
  ) sub;

  RETURN jsonb_build_object(
    'total', total_count,
    'online', online_count,
    'per_region', per_region
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_member_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_member_stats() TO authenticated;