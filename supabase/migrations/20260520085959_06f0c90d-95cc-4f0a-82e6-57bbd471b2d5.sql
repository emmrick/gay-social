-- New pricing: 0.01€ / 10 impressions => cost_per_mille_cents = 100
--              0.02€ / click       => cost_per_click_cents = 2

ALTER TABLE public.ads ALTER COLUMN cost_per_mille_cents SET DEFAULT 100;
ALTER TABLE public.ads ALTER COLUMN cost_per_click_cents SET DEFAULT 2;

-- Backfill ads still on old defaults
UPDATE public.ads SET cost_per_mille_cents = 100 WHERE cost_per_mille_cents = 10 OR cost_per_mille_cents IS NULL;
UPDATE public.ads SET cost_per_click_cents = 2   WHERE cost_per_click_cents = 1  OR cost_per_click_cents IS NULL;

CREATE OR REPLACE FUNCTION public.increment_ad_impressions(_ad_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ad RECORD;
  _cost_cents NUMERIC;
  _wallet_balance INTEGER;
BEGIN
  SELECT * INTO _ad FROM public.ads WHERE id = _ad_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT COALESCE(_ad.always_active, false) THEN
    SELECT balance_cents INTO _wallet_balance
    FROM public.advertiser_wallets
    WHERE advertiser_email = _ad.advertiser_email;

    IF COALESCE(_wallet_balance, 0) < 500 THEN
      UPDATE public.ads SET is_active = false, updated_at = now() WHERE id = _ad_id;
      RETURN;
    END IF;
  END IF;

  -- 0.01€ per 10 impressions = 100 cents per 1000 impressions = 0.1 cent per impression
  _cost_cents := COALESCE(_ad.cost_per_mille_cents, 100)::numeric / 1000.0;

  IF _ad.advertiser_email IS NOT NULL THEN
    UPDATE public.advertiser_wallets
    SET balance_cents = GREATEST(0, balance_cents - CEIL(_cost_cents)::integer),
        total_spent_cents = total_spent_cents + CEIL(_cost_cents)::integer,
        updated_at = now()
    WHERE advertiser_email = _ad.advertiser_email
      AND balance_cents > 0;
  END IF;

  UPDATE public.ads
  SET impressions_count = COALESCE(impressions_count, 0) + 1,
      spent_cents = COALESCE(spent_cents, 0) + CEIL(_cost_cents)::integer,
      updated_at = now()
  WHERE id = _ad_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_ad_clicks(_ad_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ad RECORD;
  _cost INTEGER;
  _wallet_balance INTEGER;
BEGIN
  SELECT * INTO _ad FROM public.ads WHERE id = _ad_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT COALESCE(_ad.always_active, false) THEN
    SELECT balance_cents INTO _wallet_balance
    FROM public.advertiser_wallets
    WHERE advertiser_email = _ad.advertiser_email;

    IF COALESCE(_wallet_balance, 0) < 500 THEN
      UPDATE public.ads SET is_active = false, updated_at = now() WHERE id = _ad_id;
      RETURN;
    END IF;
  END IF;

  _cost := COALESCE(_ad.cost_per_click_cents, 2);

  IF _ad.advertiser_email IS NOT NULL THEN
    UPDATE public.advertiser_wallets
    SET balance_cents = GREATEST(0, balance_cents - _cost),
        total_spent_cents = total_spent_cents + _cost,
        updated_at = now()
    WHERE advertiser_email = _ad.advertiser_email
      AND balance_cents > 0;
  END IF;

  UPDATE public.ads
  SET clicks_count = COALESCE(clicks_count, 0) + 1,
      spent_cents = COALESCE(spent_cents, 0) + _cost,
      updated_at = now()
  WHERE id = _ad_id;
END;
$function$;