-- Ajout d'une colonne pour rendre configurable le surcoût au-delà du dernier palier.
-- On stocke ce paramètre directement sur la dernière ligne du barème (le bloc "10+" actuellement).
ALTER TABLE public.personal_chatbot_pricing
  ADD COLUMN IF NOT EXISTS extra_cost_per_node INTEGER NOT NULL DEFAULT 0;

-- Initialise la valeur "+30/bloc supplémentaire" sur la dernière ligne (palier 10) pour rester compatible.
UPDATE public.personal_chatbot_pricing
SET extra_cost_per_node = 30
WHERE node_count = (SELECT MAX(node_count) FROM public.personal_chatbot_pricing);

-- Recompute function : utilise désormais le extra_cost_per_node de la dernière ligne au lieu du hardcoded 30.
CREATE OR REPLACE FUNCTION public.compute_chatbot_node_cost(_count integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  base_cost INTEGER;
  max_tier INTEGER;
  tier_cost INTEGER;
  extra_cost INTEGER;
BEGIN
  IF _count <= 0 THEN RETURN 0; END IF;

  SELECT total_cost INTO base_cost
  FROM public.personal_chatbot_pricing
  WHERE node_count = _count;

  IF base_cost IS NOT NULL THEN
    RETURN base_cost;
  END IF;

  -- Au-delà du barème : prend le dernier palier + (extra_cost_per_node × blocs supplémentaires)
  SELECT node_count, total_cost, COALESCE(extra_cost_per_node, 30)
  INTO max_tier, tier_cost, extra_cost
  FROM public.personal_chatbot_pricing
  ORDER BY node_count DESC
  LIMIT 1;

  RETURN COALESCE(tier_cost, 0) + (GREATEST(0, _count - COALESCE(max_tier, 0)) * COALESCE(extra_cost, 30));
END;
$function$;

-- Politiques RLS : admins peuvent gérer le barème.
DROP POLICY IF EXISTS "Admins can manage chatbot pricing" ON public.personal_chatbot_pricing;
CREATE POLICY "Admins can manage chatbot pricing"
ON public.personal_chatbot_pricing
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lecture publique (pour que les utilisateurs voient leur coût)
DROP POLICY IF EXISTS "Anyone can read chatbot pricing" ON public.personal_chatbot_pricing;
CREATE POLICY "Anyone can read chatbot pricing"
ON public.personal_chatbot_pricing
FOR SELECT
TO authenticated
USING (true);