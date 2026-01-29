import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook to check if specific users are premium
export const usePremiumUsers = (userIds: string[]) => {
  return useQuery({
    queryKey: ['premium-users', userIds],
    queryFn: async () => {
      if (!userIds.length) return {};

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, is_premium')
        .in('user_id', userIds);

      if (error) throw error;

      const premiumMap: Record<string, boolean> = {};
      (data || []).forEach(profile => {
        premiumMap[profile.user_id] = profile.is_premium || false;
      });

      return premiumMap;
    },
    enabled: userIds.length > 0,
    staleTime: 60000, // Cache for 1 minute
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
