
-- ============================================================
-- 1. PROFILES — sensitive columns protection
-- ============================================================

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

GRANT SELECT ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  first_name text,
  last_name text,
  phone_number text,
  latitude double precision,
  longitude double precision,
  location_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT first_name, last_name, phone_number, latitude, longitude, location_updated_at
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_full_profile(_user_id uuid)
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles
  WHERE user_id = _user_id
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));
$$;

REVOKE ALL ON FUNCTION public.admin_get_full_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_full_profile(uuid) TO authenticated;

-- ============================================================
-- 2. ADS — hide advertiser_email
-- ============================================================

REVOKE SELECT ON public.ads FROM anon;
REVOKE SELECT ON public.ads FROM authenticated;

GRANT SELECT (
  id, title, description, image_url, link_url, advertiser_name,
  placement, status, rejection_reason, target_pages,
  budget_cents, spent_cents, cost_per_click_cents, cost_per_mille_cents,
  impressions_count, clicks_count, max_impressions, max_clicks,
  starts_at, ends_at, is_active, created_by, reviewed_by, reviewed_at,
  created_at, updated_at, geo_targeting, geo_postal_codes, always_active, image_urls
) ON public.ads TO anon;

GRANT SELECT (
  id, title, description, image_url, link_url, advertiser_name,
  placement, status, rejection_reason, target_pages,
  budget_cents, spent_cents, cost_per_click_cents, cost_per_mille_cents,
  impressions_count, clicks_count, max_impressions, max_clicks,
  starts_at, ends_at, is_active, created_by, reviewed_by, reviewed_at,
  created_at, updated_at, geo_targeting, geo_postal_codes, always_active, image_urls
) ON public.ads TO authenticated;

GRANT SELECT ON public.ads TO service_role;

-- ============================================================
-- 3. COUPLE_INVITATIONS
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.couple_invitations;

CREATE POLICY "Inviter or invitee can read invitation"
ON public.couple_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = inviter_user_id
  OR lower(invitee_email) = lower((auth.jwt() ->> 'email'))
);

-- ============================================================
-- 4. MEDIA BUCKET
-- ============================================================

DROP POLICY IF EXISTS "Users can view media in their folder" ON storage.objects;

CREATE POLICY "Users can view media in their own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ============================================================
-- 5. PERSONAL_CHATBOT_NODES
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read active nodes" ON public.personal_chatbot_nodes;

CREATE POLICY "Authenticated users can read active nodes"
ON public.personal_chatbot_nodes
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================
-- 6. ADVERTISER_PROMO_CODES
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.advertiser_promo_codes;

CREATE POLICY "Authenticated users can read active promo codes"
ON public.advertiser_promo_codes
FOR SELECT
TO authenticated
USING (is_active = true);
