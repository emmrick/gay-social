CREATE OR REPLACE FUNCTION public.get_nearby_profiles(user_lat double precision, user_lon double precision, max_distance_km double precision DEFAULT 50000, limit_count integer DEFAULT 1000)
 RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, bio text, age integer, is_online boolean, last_seen timestamp with time zone, region text, distance_km double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.username,
    COALESCE(p.avatar_url, (
      SELECT pp.photo_url FROM public.profile_photos pp
      WHERE pp.user_id = p.user_id AND pp.is_primary = true
      LIMIT 1
    ), (
      SELECT pp2.photo_url FROM public.profile_photos pp2
      WHERE pp2.user_id = p.user_id
      ORDER BY pp2.display_order ASC
      LIMIT 1
    )) as avatar_url,
    p.bio,
    p.age,
    p.is_online,
    p.last_seen,
    p.region,
    public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) as distance_km
  FROM public.profiles p
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.user_id != auth.uid()
    AND p.is_verified = true
    AND public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) <= max_distance_km
    AND NOT public.is_user_blocked(p.user_id)
    AND NOT public.is_user_suspended(p.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.location_hide_periods lhp
      WHERE lhp.user_id = p.user_id
        AND lhp.is_currently_hidden = true
        AND lhp.expires_at > now()
    )
    AND (
      p.avatar_url IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.profile_photos pp3 WHERE pp3.user_id = p.user_id LIMIT 1)
    )
  ORDER BY
    public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) ASC
  LIMIT limit_count;
END;
$function$;