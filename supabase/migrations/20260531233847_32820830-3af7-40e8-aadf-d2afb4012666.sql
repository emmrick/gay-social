
CREATE OR REPLACE FUNCTION public.admin_search_profiles(_query text)
RETURNS TABLE (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  age integer,
  region text,
  phone_number text,
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.first_name, p.last_name, p.avatar_url,
         p.age, p.region, p.phone_number, p.is_verified
  FROM public.profiles p
  WHERE (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
    AND (
      p.username ILIKE '%' || _query || '%'
      OR p.first_name ILIKE '%' || _query || '%'
      OR p.last_name ILIKE '%' || _query || '%'
      OR p.phone_number ILIKE '%' || _query || '%'
    )
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.admin_search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_profiles(text) TO authenticated;
