import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Cache for premium status to avoid repeated lookups
const premiumCache = new Map<string, { isPremium: boolean; timestamp: number }>();
const CACHE_DURATION = 120000; // 2 minutes

// Hook to check if specific users are premium
export const usePremiumUsers = (userIds: string[]) => {
  return useQuery({
    queryKey: ['premium-users', userIds],
    queryFn: async () => {
      if (!userIds.length) return {};

      const now = Date.now();
      const premiumMap: Record<string, boolean> = {};
      const uncachedIds: string[] = [];

      // Check cache first
      userIds.forEach(id => {
        const cached = premiumCache.get(id);
        if (cached && now - cached.timestamp < CACHE_DURATION) {
          premiumMap[id] = cached.isPremium;
        } else {
          uncachedIds.push(id);
        }
      });

      // Only fetch uncached users
      if (uncachedIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, is_premium')
          .in('user_id', uncachedIds);

        if (error) throw error;

        (data || []).forEach(profile => {
          const isPremium = profile.is_premium || false;
          premiumMap[profile.user_id] = isPremium;
          premiumCache.set(profile.user_id, { isPremium, timestamp: now });
        });

        // Also cache users not found (they're not premium)
        uncachedIds.forEach(id => {
          if (!(id in premiumMap)) {
            premiumMap[id] = false;
            premiumCache.set(id, { isPremium: false, timestamp: now });
          }
        });
      }

      return premiumMap;
    },
    enabled: userIds.length > 0,
    staleTime: 120000, // Cache for 2 minutes
    gcTime: 300000, // Keep in garbage collection for 5 minutes
  });
};

// Hook to check if a single user is premium
export const useIsPremiumUser = (userId: string | undefined) => {
  const { data: premiumMap, isLoading } = usePremiumUsers(userId ? [userId] : []);
  
  return {
    isPremium: userId ? premiumMap?.[userId] || false : false,
    isLoading,
  };
};

// Function to invalidate cache for a specific user
export const invalidatePremiumCache = (userId: string) => {
  premiumCache.delete(userId);
};
