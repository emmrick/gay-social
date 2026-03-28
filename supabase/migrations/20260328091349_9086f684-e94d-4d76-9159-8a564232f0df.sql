
-- Advertiser promo codes table
CREATE TABLE public.advertiser_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  bonus_cents INTEGER NOT NULL DEFAULT 0,
  bonus_percent INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Track redemptions
CREATE TABLE public.advertiser_promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.advertiser_promo_codes(id),
  advertiser_email TEXT NOT NULL,
  bonus_cents_applied INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.advertiser_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active codes (for validation)
CREATE POLICY "Anyone can read active promo codes" ON public.advertiser_promo_codes
  FOR SELECT USING (true);

-- Only admins can insert/update
CREATE POLICY "Admins manage promo codes" ON public.advertiser_promo_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read redemptions" ON public.advertiser_promo_redemptions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert redemptions" ON public.advertiser_promo_redemptions
  FOR INSERT WITH CHECK (true);

-- Update increment functions to check minimum 5€ wallet balance
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

  -- Check wallet has minimum 500 cents (5€)
  SELECT balance_cents INTO _wallet_balance
  FROM public.advertiser_wallets
  WHERE advertiser_email = _ad.advertiser_email;

  IF COALESCE(_wallet_balance, 0) < 500 THEN
    -- Deactivate the ad
    UPDATE public.ads SET is_active = false, updated_at = now() WHERE id = _ad_id;
    RETURN;
  END IF;

  _cost_cents := COALESCE(_ad.cost_per_mille_cents, 10)::numeric / 1000.0;

  UPDATE public.advertiser_wallets
  SET balance_cents = GREATEST(0, balance_cents - CEIL(_cost_cents)::integer),
      total_spent_cents = total_spent_cents + CEIL(_cost_cents)::integer,
      updated_at = now()
  WHERE advertiser_email = _ad.advertiser_email
    AND balance_cents > 0;

  UPDATE public.ads
  SET impressions_count = COALESCE(impressions_count, 0) + 1,
      spent_cents = COALESCE(spent_cents, 0) + CEIL(_cost_cents)::integer,
      updated_at = now()
  WHERE id = _ad_id;
END;
$function$;

-- Update click function with same 5€ minimum check
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

  -- Check wallet has minimum 500 cents (5€)
  SELECT balance_cents INTO _wallet_balance
  FROM public.advertiser_wallets
  WHERE advertiser_email = _ad.advertiser_email;

  IF COALESCE(_wallet_balance, 0) < 500 THEN
    UPDATE public.ads SET is_active = false, updated_at = now() WHERE id = _ad_id;
    RETURN;
  END IF;

  _cost := COALESCE(_ad.cost_per_click_cents, 1);

  UPDATE public.advertiser_wallets
  SET balance_cents = GREATEST(0, balance_cents - _cost),
      total_spent_cents = total_spent_cents + _cost,
      updated_at = now()
  WHERE advertiser_email = _ad.advertiser_email
    AND balance_cents > 0;

  UPDATE public.ads
  SET clicks_count = COALESCE(clicks_count, 0) + 1,
      spent_cents = COALESCE(spent_cents, 0) + _cost,
      updated_at = now()
  WHERE id = _ad_id;
END;
$function$;
