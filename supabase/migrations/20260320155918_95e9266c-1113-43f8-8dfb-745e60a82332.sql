
-- Function to increment ad impressions
CREATE OR REPLACE FUNCTION public.increment_ad_impressions(_ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ads
  SET impressions_count = impressions_count + 1,
      spent_cents = spent_cents + COALESCE(cost_per_mille_cents, 10) / 1000,
      updated_at = now()
  WHERE id = _ad_id;
END;
$$;

-- Function to increment ad clicks
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(_ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ads
  SET clicks_count = clicks_count + 1,
      spent_cents = spent_cents + COALESCE(cost_per_click_cents, 2),
      updated_at = now()
  WHERE id = _ad_id;
END;
$$;
