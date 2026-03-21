
-- Table for dynamic credit purchase offers
CREATE TABLE public.credit_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credits NUMERIC NOT NULL,
  price_euros NUMERIC NOT NULL,
  original_price_euros NUMERIC,
  discount_percent INTEGER,
  is_highlighted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_offers ENABLE ROW LEVEL SECURITY;

-- Everyone can read active offers
CREATE POLICY "Anyone can read active credit offers"
ON public.credit_offers FOR SELECT
USING (true);

-- Only admins can manage offers
CREATE POLICY "Admins can manage credit offers"
ON public.credit_offers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_credit_offers_updated_at
BEFORE UPDATE ON public.credit_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default offers (replacing hardcoded ones)
INSERT INTO public.credit_offers (credits, price_euros, display_order) VALUES
  (50, 4.99, 1),
  (120, 9.99, 2);

INSERT INTO public.credit_offers (credits, price_euros, original_price_euros, discount_percent, is_highlighted, display_order) VALUES
  (350, 19.99, 29.99, 33, true, 3),
  (800, 39.99, 69.99, 43, false, 4);

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_offers;
