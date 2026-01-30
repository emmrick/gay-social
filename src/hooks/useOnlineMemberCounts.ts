import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOnlineMemberCounts = () => {
  return useQuery({
    queryKey: ['online-member-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      // Only count members who are marked online AND have been active in the last 5 minutes
      // This prevents counting stale "online" statuses from users who didn't properly disconnect
      const recentThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('region')
        .eq('is_online', true)
        .gte('last_seen', recentThreshold);

      if (error) throw error;

      // Count members per region
      const counts: Record<string, number> = {};
      data?.forEach((profile) => {
        counts[profile.region] = (counts[profile.region] || 0) + 1;
      });

      return counts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnMount: 'always',
    staleTime: 0,
  });
};
