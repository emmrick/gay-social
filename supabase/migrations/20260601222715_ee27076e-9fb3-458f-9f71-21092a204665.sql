
-- Re-revoke sensitive columns on profiles (rollback re-granted everything)
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, user_id, username, avatar_url, region, bio, is_online, last_seen,
  created_at, updated_at, age, sexual_position, looking_for, body_type,
  height, weight, ethnicity, relationship_status, hiv_status, tribes,
  accepts_nsfw, show_face, endowment, position_detail, is_verified,
  is_premium, hide_online_status, hide_last_seen, theme_preference,
  birth_date, show_birthday, first_verified_at, couple_account_id, couple_role
) ON public.profiles TO authenticated;

-- INSERT/UPDATE/DELETE remain unchanged (RLS-controlled)
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- RPC: récupérer le profil COMPLET du partenaire couple (accès légitime)
CREATE OR REPLACE FUNCTION public.get_couple_partner_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.couple_account_id IS NOT NULL
    AND p.couple_account_id = (
      SELECT couple_account_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND p.user_id <> auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_couple_partner_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_couple_partner_profile() TO authenticated;
