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
        // Fallback: get profiles sorted by online status / last_seen
        // Filter blocked/suspended users via SQL subqueries to avoid N+1 RPC calls
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('user_id', user?.id || '')
          .not('user_id', 'in', `(select user_id from user_blocks where is_active = true)`)
          .order('is_online', { ascending: false })
          .order('last_seen', { ascending: false, nullsFirst: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;
        
        const filteredProfiles = (data || []).map((profile) => fixStaleOnlineStatus({
          ...profile,
          distance_km: null,
        }));

        const hasMore = filteredProfiles.length === PAGE_SIZE;
        return { 
          profiles: filteredProfiles, 
          nextPage: hasMore ? pageParam + 1 : null 
        };
      }

      // With geolocation: use RPC with proper pagination
      // RPC already filters blocked/suspended users
      const fetchLimit = (pageParam + 1) * PAGE_SIZE + PAGE_SIZE; // Fetch enough for current + next check
      const { data, error } = await supabase
        .rpc('get_nearby_profiles', {
          user_lat: latitude,
          user_lon: longitude,
          max_distance_km: maxDistance,
          limit_count: fetchLimit,
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
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 45000,
    gcTime: 120000,
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
