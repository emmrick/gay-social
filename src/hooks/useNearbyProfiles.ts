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
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      let profiles = (data || []).map(p => fixStaleOnlineStatus({ ...p, distance_km: null }));

      // Filter out suspended/blocked users
      const checks = await Promise.all(
        profiles.map(p => supabase.rpc('is_user_suspended_or_blocked', { _user_id: p.user_id }))
      );
      profiles = profiles.filter((_, i) => checks[i].data !== true);

      // Fetch primary photos for profiles missing avatar_url
      const missingAvatarIds = profiles.filter(p => !p.avatar_url).map(p => p.user_id);
      if (missingAvatarIds.length > 0) {
        const { data: photos } = await supabase
          .from('profile_photos')
          .select('user_id, photo_url, is_primary, display_order')
          .in('user_id', missingAvatarIds)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true });

        if (photos && photos.length > 0) {
          const photoMap = new Map<string, string>();
          for (const photo of photos) {
            if (!photoMap.has(photo.user_id)) {
              photoMap.set(photo.user_id, photo.photo_url);
            }
          }
          return profiles.map(p => 
            !p.avatar_url && photoMap.has(p.user_id) 
              ? { ...p, avatar_url: photoMap.get(p.user_id)! } 
              : p
          );
        }
      }

      return profiles;
    },
    enabled: !!user,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchInterval: 300000,
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
      const geoProfiles = (data || []).map(fixStaleOnlineStatus);

      // Filter out suspended/blocked users
      const checks = await Promise.all(
        geoProfiles.map(p => supabase.rpc('is_user_suspended_or_blocked', { _user_id: p.user_id }))
      );
      return geoProfiles.filter((_, i) => checks[i].data !== true);
    },
    enabled: !!user && latitude != null && longitude != null,
    staleTime: 45000,
    gcTime: 120000,
    refetchInterval: 300000, // 5 minutes
  });

  // Merge: geo-sorted profiles first, then remaining base profiles not in geo results
  const mergedProfiles = useMemo(() => {
    const geoProfiles = geoQuery.data ?? [];
    const baseProfiles = baseQuery.data ?? [];
    if (geoProfiles.length === 0) return baseProfiles;
    const geoUserIds = new Set(geoProfiles.map(p => p.user_id));
    const remaining = baseProfiles.filter(p => !geoUserIds.has(p.user_id));
    return [...geoProfiles, ...remaining];
  }, [geoQuery.data, baseQuery.data]);

  const hasGeoData = geoQuery.isSuccess && (geoQuery.data?.length ?? 0) > 0;
  const profiles = mergedProfiles;
  const isLoading = baseQuery.isLoading;

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
