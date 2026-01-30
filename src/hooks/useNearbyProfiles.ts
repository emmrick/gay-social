import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, FREE_LIMITS, PREMIUM_LIMITS } from './useSubscription';
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

export const useNearbyProfiles = (
  latitude: number | null,
  longitude: number | null,
  maxDistance: number = 100
) => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  // Calculate offline threshold based on subscription status
  const getOfflineThreshold = () => {
    return isPremium 
      ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours for Premium
      : new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour for free
  };

  const maxProfilesAllowed = isPremium 
    ? PREMIUM_LIMITS.nearbyProfiles 
    : FREE_LIMITS.nearbyProfiles;

  const query = useInfiniteQuery({
    queryKey: ['nearby-profiles', latitude, longitude, maxDistance, isPremium],
    queryFn: async ({ pageParam = 0 }): Promise<{ profiles: NearbyProfile[]; nextPage: number | null }> => {
      const offlineThreshold = getOfflineThreshold();
      const offset = pageParam * PAGE_SIZE;
      
      // Apply limit based on subscription for total profiles
      const remainingAllowed = Math.max(0, maxProfilesAllowed - offset);
      const effectiveLimit = Math.min(PAGE_SIZE, remainingAllowed);
      
      if (effectiveLimit <= 0) {
        return { profiles: [], nextPage: null };
      }

      // Use explicit null/undefined checks (0 is a valid coordinate).
      if (latitude == null || longitude == null) {
        // Fallback: get online profiles or recently active
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('user_id', user?.id || '')
          .or(`is_online.eq.true,last_seen.gte.${offlineThreshold}`)
          .order('is_online', { ascending: false })
          .order('last_seen', { ascending: false })
          .range(offset, offset + effectiveLimit - 1);

        if (error) throw error;
        
        const profiles = (data || []).map(profile => ({
          ...profile,
          distance_km: null,
        }));

        const hasMore = profiles.length === effectiveLimit && (offset + profiles.length) < maxProfilesAllowed;
        return { 
          profiles, 
          nextPage: hasMore ? pageParam + 1 : null 
        };
      }

      // Use the nearby profiles function with pagination
      const { data, error } = await supabase
        .rpc('get_nearby_profiles', {
          user_lat: latitude,
          user_lon: longitude,
          max_distance_km: maxDistance,
          limit_count: effectiveLimit + offset, // Get all up to this point
        });

      if (error) throw error;
      
      // Filter out users who are offline beyond the threshold
      const filteredData = (data || []).filter(profile => {
        if (profile.is_online) return true;
        if (!profile.last_seen) return false;
        return new Date(profile.last_seen) >= new Date(offlineThreshold);
      });
      
      // Apply pagination manually since RPC doesn't support offset
      const paginatedProfiles = filteredData.slice(offset, offset + effectiveLimit);
      
      const hasMore = paginatedProfiles.length === effectiveLimit && (offset + paginatedProfiles.length) < maxProfilesAllowed;
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
    staleTime: 30000, // 30 seconds - less aggressive refetching
    gcTime: 60000,
  });

  // Flatten all pages into single array
  const allProfiles = useMemo(() => {
    return query.data?.pages.flatMap(page => page.profiles) ?? [];
  }, [query.data]);

  const isLimited = !isPremium && allProfiles.length >= FREE_LIMITS.nearbyProfiles;

  return {
    data: allProfiles,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    maxProfilesAllowed,
    isPremium,
    isLimited,
  };
};

export default useNearbyProfiles;
