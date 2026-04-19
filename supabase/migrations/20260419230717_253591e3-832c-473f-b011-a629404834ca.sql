-- Paliers de parrainage (catalogue global)
CREATE TABLE IF NOT EXISTS public.referral_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold integer NOT NULL UNIQUE,
  bonus_credits numeric NOT NULL DEFAULT 0,
  label text NOT NULL,
  badge_emoji text NOT NULL DEFAULT '🏆',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view milestones" ON public.referral_milestones;
CREATE POLICY "Anyone authenticated can view milestones"
  ON public.referral_milestones
  FOR SELECT
  TO authenticated
  USING (true);

-- Paliers déjà débloqués par utilisateur
CREATE TABLE IF NOT EXISTS public.user_referral_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_id uuid NOT NULL REFERENCES public.referral_milestones(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  bonus_credited numeric NOT NULL DEFAULT 0,
  UNIQUE (user_id, milestone_id)
);

ALTER TABLE public.user_referral_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own unlocked milestones" ON public.user_referral_milestones;
CREATE POLICY "Users view own unlocked milestones"
  ON public.user_referral_milestones
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_referral_milestones_user ON public.user_referral_milestones(user_id);

-- Insertion des paliers par défaut
INSERT INTO public.referral_milestones (threshold, bonus_credits, label, badge_emoji, description) VALUES
  (1, 0, 'Premier pas', '🌱', 'Votre tout premier filleul vérifié !'),
  (3, 20, 'Ambassadeur', '⭐', '3 amis vous font confiance.'),
  (5, 50, 'Influenceur', '🔥', 'Vous savez convaincre !'),
  (10, 150, 'Star du parrainage', '🚀', '10 filleuls, vous êtes une star.'),
  (25, 500, 'Légende', '👑', 'Un quart de cent ! Légendaire.'),
  (50, 1500, 'Hall of Fame', '🏆', 'Vous entrez dans la légende.')
ON CONFLICT (threshold) DO NOTHING;

-- Fonction d'attribution automatique des paliers
CREATE OR REPLACE FUNCTION public.claim_referral_milestones(_user_id uuid)
RETURNS TABLE (milestone_id uuid, threshold integer, bonus_credits numeric, label text, badge_emoji text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_count integer;
  v_milestone record;
BEGIN
  -- Compter filleuls dont la récompense parrain a été appliquée (= vérifiés)
  SELECT COUNT(*) INTO v_verified_count
  FROM public.referrals
  WHERE referrer_user_id = _user_id
    AND referrer_reward_applied = true;

  -- Parcourir les paliers atteints non encore débloqués
  FOR v_milestone IN
    SELECT m.*
    FROM public.referral_milestones m
    WHERE m.threshold <= v_verified_count
      AND NOT EXISTS (
        SELECT 1 FROM public.user_referral_milestones u
        WHERE u.user_id = _user_id AND u.milestone_id = m.id
      )
    ORDER BY m.threshold ASC
  LOOP
    -- Marquer comme débloqué
    INSERT INTO public.user_referral_milestones (user_id, milestone_id, bonus_credited)
    VALUES (_user_id, v_milestone.id, v_milestone.bonus_credits)
    ON CONFLICT (user_id, milestone_id) DO NOTHING;

    -- Créditer le bonus si > 0
    IF v_milestone.bonus_credits > 0 THEN
      UPDATE public.user_credits
      SET bonus_credits = bonus_credits + v_milestone.bonus_credits,
          updated_at = now()
      WHERE user_id = _user_id;

      INSERT INTO public.credit_transactions (user_id, amount, credit_type, transaction_type, description)
      VALUES (
        _user_id,
        v_milestone.bonus_credits,
        'bonus'::credit_type,
        'earn',
        'Palier parrainage débloqué : ' || v_milestone.label
      );
    END IF;

    -- Renvoyer le palier débloqué
    milestone_id := v_milestone.id;
    threshold := v_milestone.threshold;
    bonus_credits := v_milestone.bonus_credits;
    label := v_milestone.label;
    badge_emoji := v_milestone.badge_emoji;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;