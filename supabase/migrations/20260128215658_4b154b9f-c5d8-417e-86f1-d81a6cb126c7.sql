-- Add age and location to profiles for proximity features
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_updated_at timestamp with time zone;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision AS $$
DECLARE
  R double precision := 6371; -- Earth radius in km
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create function to get nearby profiles
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
  user_lat double precision,
  user_lon double precision,
  max_distance_km double precision DEFAULT 100,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  bio text,
  age integer,
  is_online boolean,
  last_seen timestamp with time zone,
  region text,
  distance_km double precision
) AS $$
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
  ORDER BY 
    p.is_online DESC,
    public.calculate_distance(user_lat, user_lon, p.latitude, p.longitude) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;