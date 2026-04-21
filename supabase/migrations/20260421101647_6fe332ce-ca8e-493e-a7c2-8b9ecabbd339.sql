-- 1. Drop legacy AI conversations table
DROP TABLE IF EXISTS public.chatbot_conversations CASCADE;

-- 2. Pricing tiers (admin configurable)
CREATE TABLE IF NOT EXISTS public.personal_chatbot_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_count INTEGER NOT NULL UNIQUE,
  total_cost INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_chatbot_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chatbot pricing"
  ON public.personal_chatbot_pricing FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify pricing"
  ON public.personal_chatbot_pricing FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.personal_chatbot_pricing (node_count, total_cost) VALUES
  (1, 1), (2, 3), (3, 7), (4, 12), (5, 18),
  (6, 25), (7, 33), (8, 42), (9, 52), (10, 63)
ON CONFLICT (node_count) DO NOTHING;

-- 3. Nodes (decision tree)
CREATE TABLE IF NOT EXISTS public.personal_chatbot_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.personal_chatbot_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  response_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_root BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_chatbot_nodes_user 
  ON public.personal_chatbot_nodes (user_id, parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_personal_chatbot_nodes_root
  ON public.personal_chatbot_nodes (user_id) WHERE is_root = true;

ALTER TABLE public.personal_chatbot_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active nodes"
  ON public.personal_chatbot_nodes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owner can read all own nodes"
  ON public.personal_chatbot_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own nodes"
  ON public.personal_chatbot_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own nodes"
  ON public.personal_chatbot_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own nodes"
  ON public.personal_chatbot_nodes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_chatbot_nodes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chatbot_nodes_updated ON public.personal_chatbot_nodes;
CREATE TRIGGER trg_chatbot_nodes_updated
  BEFORE UPDATE ON public.personal_chatbot_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_chatbot_nodes_updated_at();

-- 4. Compute cost helper (returns TOTAL cost for N nodes)
CREATE OR REPLACE FUNCTION public.compute_chatbot_node_cost(_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  base_cost INTEGER;
  max_tier INTEGER;
  tier_cost INTEGER;
BEGIN
  IF _count <= 0 THEN RETURN 0; END IF;
  
  SELECT total_cost INTO base_cost
  FROM public.personal_chatbot_pricing
  WHERE node_count = _count;
  
  IF base_cost IS NOT NULL THEN
    RETURN base_cost;
  END IF;
  
  -- Beyond pricing table: take max tier + 30 per extra node
  SELECT MAX(node_count), MAX(total_cost) INTO max_tier, tier_cost
  FROM public.personal_chatbot_pricing;
  
  RETURN COALESCE(tier_cost, 0) + (GREATEST(0, _count - COALESCE(max_tier, 0)) * 30);
END;
$$;

-- 5. Purchase function: charges credits for the next node
CREATE OR REPLACE FUNCTION public.purchase_chatbot_node(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  current_cost INTEGER;
  next_cost INTEGER;
  delta INTEGER;
  user_credits INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.personal_chatbot_nodes
  WHERE user_id = _user_id;
  
  current_cost := public.compute_chatbot_node_cost(current_count);
  next_cost := public.compute_chatbot_node_cost(current_count + 1);
  delta := next_cost - current_cost;
  
  IF delta <= 0 THEN
    RETURN jsonb_build_object('success', true, 'cost', 0, 'message', 'free');
  END IF;
  
  SELECT COALESCE(credits, 0) INTO user_credits
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF user_credits < delta THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'required', delta,
      'available', user_credits
    );
  END IF;
  
  UPDATE public.profiles
  SET credits = credits - delta,
      updated_at = now()
  WHERE user_id = _user_id;
  
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, credit_type, description)
  VALUES (_user_id, -delta, 'spend', 'spent', 'Bloc chatbot personnel #' || (current_count + 1));
  
  RETURN jsonb_build_object('success', true, 'cost', delta, 'new_total_nodes', current_count + 1);
END;
$$;