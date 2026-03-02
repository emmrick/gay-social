import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { useMemo } from 'react';

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

const ONLINE_STATUS_STALE_HOURS = 2;

const fixStaleOnlineStatus = (profile: NearbyProfile): NearbyProfile => {
  if (profile.is_online && profile.last_seen) {
    const staleThreshold = new Date(Date.now() - ONLINE_STATUS_STALE_HOURS * 60 * 60 * 1000);
    if (new Date(profile.last_seen) < staleThreshold) {
      return { ...profile, is_online: false };
    }
  }
  return profile;
};

export const useNearbyProfiles = (
  latitude: number | null,
  longitude: number | null,
  maxDistance: number = 50000
) => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  // Query 1: Always fetch profiles immediately (no geolocation dependency)
  const baseQuery = useQuery({
    queryKey: ['nearby-profiles-base', user?.id],
    queryFn: async (): Promise<NearbyProfile[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, bio, age, is_online, last_seen, region')
        .neq('user_id', user.id)
        .not('user_id', 'in', `(select user_id from user_blocks where is_active = true)`)
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      return (data || []).map(p => fixStaleOnlineStatus({ ...p, distance_km: null }));
    },
    enabled: !!user,
    staleTime: 30000,
    gcTime: 120000,
  });

  // Query 2: When geolocation is available, fetch with distances (runs in parallel / replaces)
  const geoQuery = useQuery({
    queryKey: ['nearby-profiles-geo', latitude, longitude, maxDistance],
    queryFn: async (): Promise<NearbyProfile[]> => {
      if (latitude == null || longitude == null) return [];

      const { data, error } = await supabase
        .rpc('get_nearby_profiles', {
          user_lat: latitude,
          user_lon: longitude,
          max_distance_km: maxDistance,
          limit_count: 200,
        });

      if (error) throw error;
      return (data || []).map(fixStaleOnlineStatus);
    },
    enabled: !!user && latitude != null && longitude != null,
    staleTime: 45000,
    gcTime: 120000,
  });

  // Use geo-sorted data when available, otherwise base data
  const hasGeoData = geoQuery.isSuccess && (geoQuery.data?.length ?? 0) > 0;
  const profiles = hasGeoData ? geoQuery.data! : baseQuery.data ?? [];
  const isLoading = !hasGeoData ? baseQuery.isLoading : false;

  return {
    data: profiles,
    isLoading,
    error: baseQuery.error || geoQuery.error,
    refetch: () => {
      baseQuery.refetch();
      if (latitude != null && longitude != null) geoQuery.refetch();
    },
    isPremium,
    hasGeoData,
  };
};

export default useNearbyProfiles;
