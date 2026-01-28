import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OnlineCount {
  region: string;
  count: number;
}

export const useOnlineMemberCounts = () => {
  return useQuery({
    queryKey: ['online-member-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('region')
        .eq('is_online', true);

      if (error) throw error;

      // Count members per region
      const counts: Record<string, number> = {};
      data?.forEach((profile) => {
        counts[profile.region] = (counts[profile.region] || 0) + 1;
      });

      return counts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
