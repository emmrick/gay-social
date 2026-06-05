CREATE OR REPLACE FUNCTION public.get_nearby_profiles(user_lat double precision, user_lon double precision, max_distance_km double precision DEFAULT 50000, limit_count integer DEFAULT 1000)
 RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, bio text, age integer, is_online boolean, last_seen timestamp with time zone, region text, distance_km double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT
      p.id, p.user_id, p.username,
      COALESCE(p.avatar_url, (
        SELECT pp.photo_url FROM public.profile_photos pp
        WHERE pp.user_id = p.user_id AND pp.is_primary = true
        LIMIT 1
      ), (
        SELECT pp2.photo_url FROM public.profile_photos pp2
        WHERE pp2.user_id = p.user_id
        ORDER BY pp2.display_order ASC
        LIMIT 1
      )) AS avatar_url,
      p.bio, p.age, p.is_online, p.last_seen, p.region,
      CASE
        WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          THEN public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude)
        ELSE NULL
      END AS distance_km
    FROM public.profiles p
    WHERE p.user_id <> auth.uid()
      AND p.is_verified = true
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
  )
  SELECT e.id, e.user_id, e.username, e.avatar_url, e.bio, e.age, e.is_online, e.last_seen, e.region, e.distance_km
  FROM eligible e
  WHERE e.avatar_url IS NOT NULL
    AND (e.distance_km IS NULL OR e.distance_km <= max_distance_km)
  ORDER BY
    CASE WHEN e.distance_km IS NULL THEN 1 ELSE 0 END,
    e.distance_km ASC NULLS LAST,
    e.is_online DESC NULLS LAST,
    e.last_seen DESC NULLS LAST
  LIMIT limit_count;
END;
$function$;