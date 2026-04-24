-- 1. Table des votes
CREATE TABLE public.suggestion_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.user_suggestions(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, voter_user_id)
);

CREATE INDEX idx_suggestion_votes_suggestion ON public.suggestion_votes(suggestion_id);
CREATE INDEX idx_suggestion_votes_voter ON public.suggestion_votes(voter_user_id);

ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs authentifiés peuvent voir les votes (pour calculer les scores)
CREATE POLICY "Authenticated users can view all votes"
ON public.suggestion_votes
FOR SELECT
TO authenticated
USING (true);

-- L'utilisateur peut créer/modifier/supprimer uniquement ses propres votes
CREATE POLICY "Users can insert their own votes"
ON public.suggestion_votes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY "Users can update their own votes"
ON public.suggestion_votes
FOR UPDATE
TO authenticated
USING (auth.uid() = voter_user_id);

CREATE POLICY "Users can delete their own votes"
ON public.suggestion_votes
FOR DELETE
TO authenticated
USING (auth.uid() = voter_user_id);

-- Trigger updated_at
CREATE TRIGGER update_suggestion_votes_updated_at
BEFORE UPDATE ON public.suggestion_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Nouvelle politique RLS sur user_suggestions : tout le monde peut lire les idées publiques (in_review + approved)
CREATE POLICY "Public can view in-review and approved suggestions"
ON public.user_suggestions
FOR SELECT
TO authenticated
USING (status IN ('in_review', 'approved'));

-- 3. Fonction de vote sécurisée (gère débit de crédits, toggle, changement de vote)
CREATE OR REPLACE FUNCTION public.cast_suggestion_vote(
  _suggestion_id UUID,
  _vote_type TEXT  -- 'up', 'down', ou NULL pour retirer
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing TEXT;
  v_status TEXT;
  v_owner UUID;
  v_cost INTEGER := 1;
  v_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF _vote_type IS NOT NULL AND _vote_type NOT IN ('up', 'down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_VOTE_TYPE');
  END IF;

  -- Vérifier que la suggestion existe et est publique
  SELECT status, user_id INTO v_status, v_owner
  FROM public.user_suggestions
  WHERE id = _suggestion_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SUGGESTION_NOT_FOUND');
  END IF;

  IF v_status NOT IN ('in_review', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'SUGGESTION_NOT_PUBLIC');
  END IF;

  IF v_owner = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_VOTE_OWN_SUGGESTION');
  END IF;

  -- Récupérer le vote existant
  SELECT vote_type INTO v_existing
  FROM public.suggestion_votes
  WHERE suggestion_id = _suggestion_id AND voter_user_id = v_user_id;

  -- Cas 1 : retirer le vote
  IF _vote_type IS NULL THEN
    IF v_existing IS NULL THEN
      RETURN jsonb_build_object('success', true, 'action', 'noop');
    END IF;
    DELETE FROM public.suggestion_votes
    WHERE suggestion_id = _suggestion_id AND voter_user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  END IF;

  -- Cas 2 : même vote → toggle off (gratuit)
  IF v_existing = _vote_type THEN
    DELETE FROM public.suggestion_votes
    WHERE suggestion_id = _suggestion_id AND voter_user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  END IF;

  -- Cas 3 : changement de vote (up <-> down) → gratuit
  IF v_existing IS NOT NULL AND v_existing <> _vote_type THEN
    UPDATE public.suggestion_votes
    SET vote_type = _vote_type, updated_at = now()
    WHERE suggestion_id = _suggestion_id AND voter_user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'action', 'changed');
  END IF;

  -- Cas 4 : nouveau vote → débite 1 crédit
  SELECT credits INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id;

  IF COALESCE(v_balance, 0) < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'cost', v_cost);
  END IF;

  -- Débit
  UPDATE public.profiles
  SET credits = credits - v_cost
  WHERE id = v_user_id;

  -- Log transaction (table existante credit_transactions si présente)
  BEGIN
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (v_user_id, -v_cost, 'suggestion_vote', 'Vote sur une proposition communautaire');
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    -- ignore si la table n'existe pas exactement avec ces colonnes
    NULL;
  END;

  -- Insérer le vote
  INSERT INTO public.suggestion_votes (suggestion_id, voter_user_id, vote_type)
  VALUES (_suggestion_id, v_user_id, _vote_type);

  RETURN jsonb_build_object('success', true, 'action', 'added', 'cost', v_cost);
END;
$$;

-- 4. Activer realtime sur les votes pour MAJ live des compteurs
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestion_votes;