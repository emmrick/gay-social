-- Ajouter une colonne d'expiration aux referrals
ALTER TABLE public.referrals 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Mettre à jour les referrals existants avec une date d'expiration (7 jours après création)
UPDATE public.referrals 
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Rendre la colonne NOT NULL avec une valeur par défaut
ALTER TABLE public.referrals 
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '7 days'),
ALTER COLUMN expires_at SET NOT NULL;