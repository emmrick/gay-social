import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Online member counts per region.
 * Realtime invalidation is handled by the unified useRealtimeProfileSync hook.
 * No dedicated realtime channel needed here anymore.
 */
export const useOnlineMemberCounts = () => {
  return useQuery({
    queryKey: ['online-member-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const recentThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .select('region')
        .eq('is_online', true)
        .gte('last_seen', recentThreshold);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((profile) => {
        counts[profile.region] = (counts[profile.region] || 0) + 1;
      });

      return counts;
    },
    refetchInterval: 120_000, // 2 min polling (realtime handles immediate updates)
    staleTime: 60_000,
  });
};
