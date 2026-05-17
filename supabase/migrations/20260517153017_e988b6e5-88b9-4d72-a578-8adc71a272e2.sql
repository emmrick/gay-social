-- Add placement tracking on ad impressions to verify random rotation
ALTER TABLE public.ad_impressions
  ADD COLUMN IF NOT EXISTS placement TEXT;

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_placement_created
  ON public.ad_impressions (ad_id, placement, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_placement_created
  ON public.ad_impressions (placement, created_at DESC);

-- Aggregated stats function: impressions per ad + placement on a sliding window (hours)
CREATE OR REPLACE FUNCTION public.get_ad_rotation_stats(_hours INT DEFAULT 24)
RETURNS TABLE (
  ad_id UUID,
  ad_title TEXT,
  advertiser_name TEXT,
  placement TEXT,
  impressions BIGINT,
  unique_users BIGINT,
  last_impression TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.ad_id,
    a.title AS ad_title,
    a.advertiser_name,
    COALESCE(i.placement, 'unknown') AS placement,
    COUNT(*)::BIGINT AS impressions,
    COUNT(DISTINCT i.user_id)::BIGINT AS unique_users,
    MAX(i.created_at) AS last_impression
  FROM public.ad_impressions i
  JOIN public.ads a ON a.id = i.ad_id
  WHERE i.created_at > now() - (_hours || ' hours')::interval
    AND public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY i.ad_id, a.title, a.advertiser_name, COALESCE(i.placement, 'unknown')
  ORDER BY impressions DESC;
$$;
