import { useInfiniteQuery } from '@tanstack/react-query';
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

const PAGE_SIZE = 12; // Load 12 profiles at a time (4 rows of 3)

// Threshold after which we consider is_online as stale and should show as offline
const ONLINE_STATUS_STALE_HOURS = 2;

/**
 * Corrects stale online status: if is_online=true but last_seen is older
 * than the stale threshold, treat as offline.
 */
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

  const query = useInfiniteQuery({
    queryKey: ['nearby-profiles', latitude, longitude, maxDistance],
    queryFn: async ({ pageParam = 0 }): Promise<{ profiles: NearbyProfile[]; nextPage: number | null }> => {
      const offset = pageParam * PAGE_SIZE;

      // Use explicit null/undefined checks (0 is a valid coordinate).
      if (latitude == null || longitude == null) {
        // Fallback: get all profiles sorted by last_seen
        const fetchCount = PAGE_SIZE + 15;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('user_id', user?.id || '')
          .order('is_online', { ascending: false })
          .order('last_seen', { ascending: false, nullsFirst: false })
          .range(offset, offset + fetchCount - 1);

        if (error) throw error;
        
        // Filter out blocked/suspended users in parallel
        const profilesWithStatus = await Promise.all(
          (data || []).map(async (profile) => {
            const [blockedRes, suspendedRes] = await Promise.all([
              supabase.rpc('is_user_blocked', { _user_id: profile.user_id }),
              supabase.rpc('is_user_suspended', { _user_id: profile.user_id })
            ]);
            return {
              profile,
              isBlocked: blockedRes.data,
              isSuspended: suspendedRes.data
            };
          })
        );
        
        const filteredProfiles = profilesWithStatus
          .filter(({ isBlocked, isSuspended }) => !isBlocked && !isSuspended)
          .slice(0, PAGE_SIZE)
          .map(({ profile }) => fixStaleOnlineStatus({
            ...profile,
            distance_km: null,
          }));

        const hasMore = filteredProfiles.length === PAGE_SIZE;
        return { 
          profiles: filteredProfiles, 
          nextPage: hasMore ? pageParam + 1 : null 
        };
      }

      // With geolocation: fetch all profiles sorted by distance (closest first)
      const { data, error } = await supabase
        .rpc('get_nearby_profiles', {
          user_lat: latitude,
          user_lon: longitude,
          max_distance_km: maxDistance,
          limit_count: 1000,
        });

      if (error) throw error;
      
      // Fix stale online status, keep sorted by distance (RPC already sorts)
      const correctedProfiles = (data || []).map(fixStaleOnlineStatus);
      
      // Apply pagination
      const paginatedProfiles = correctedProfiles.slice(offset, offset + PAGE_SIZE);
      
      const hasMore = paginatedProfiles.length === PAGE_SIZE && (offset + PAGE_SIZE) < correctedProfiles.length;
      return { 
        profiles: paginatedProfiles, 
        nextPage: hasMore ? pageParam + 1 : null 
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 30000,
    gcTime: 60000,
  });

  // Flatten all pages into single array
  const allProfiles = useMemo(() => {
    return query.data?.pages.flatMap(page => page.profiles) ?? [];
  }, [query.data]);

  return {
    data: allProfiles,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    isPremium,
  };
};

export default useNearbyProfiles;
