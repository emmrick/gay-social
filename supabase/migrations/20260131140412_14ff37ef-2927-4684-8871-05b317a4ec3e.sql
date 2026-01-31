-- Update get_nearby_profiles function to exclude blocked/suspended users
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(user_lat double precision, user_lon double precision, max_distance_km double precision DEFAULT 100, limit_count integer DEFAULT 50)
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
    p.avatar_url,
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
    AND public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) <= max_distance_km
    -- Exclude blocked/suspended users
    AND NOT public.is_user_blocked(p.user_id)
    AND NOT public.is_user_suspended(p.user_id)
  ORDER BY 
    p.is_online DESC,
    public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) ASC
  LIMIT limit_count;
END;
$function$;