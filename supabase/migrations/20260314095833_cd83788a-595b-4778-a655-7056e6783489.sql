
CREATE TABLE public.paypal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  paypal_order_id TEXT NOT NULL UNIQUE,
  credits_amount NUMERIC NOT NULL,
  price_euros NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paypal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paypal orders"
  ON public.paypal_orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert paypal orders"
  ON public.paypal_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can update paypal orders"
  ON public.paypal_orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
