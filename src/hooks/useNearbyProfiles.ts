import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NearbyProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  is_online: boolean | null;
  last_seen: string | null;
  region: string;
  distance_km: number | null;
}

export const useNearbyProfiles = (
  latitude: number | null,
  longitude: number | null,
  maxDistance: number = 100,
  limit: number = 50
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nearby-profiles', latitude, longitude, maxDistance, limit],
    queryFn: async (): Promise<NearbyProfile[]> => {
      if (!latitude || !longitude) {
        // Fallback: get all online profiles if no location
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('user_id', user?.id || '')
          .order('is_online', { ascending: false })
          .order('last_seen', { ascending: false })
          .limit(limit);

        if (error) throw error;
        
        return (data || []).map(profile => ({
          ...profile,
          distance_km: null,
        }));
      }

      // Use the nearby profiles function
      const { data, error } = await supabase
        .rpc('get_nearby_profiles', {
          user_lat: latitude,
          user_lon: longitude,
          max_distance_km: maxDistance,
          limit_count: limit,
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
};

export default useNearbyProfiles;
