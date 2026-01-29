import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RegionMemberCount {
  region: string;
  total: number;
  online: number;
}

export const useRegionMemberCounts = () => {
  return useQuery({
    queryKey: ['region-member-counts'],
    queryFn: async (): Promise<Record<string, RegionMemberCount>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('region, is_online');

      if (error) throw error;

      // Count members per region
      const counts: Record<string, RegionMemberCount> = {};
      data?.forEach((profile) => {
        if (!counts[profile.region]) {
          counts[profile.region] = { region: profile.region, total: 0, online: 0 };
        }
        counts[profile.region].total += 1;
        if (profile.is_online === true) {
          counts[profile.region].online += 1;
        }
      });

      return counts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
};

// Get count for a specific region
export const useRegionMemberCount = (regionCode: string) => {
  const { data: counts, isLoading } = useRegionMemberCounts();
  
  return {
    total: counts?.[regionCode]?.total || 0,
    online: counts?.[regionCode]?.online || 0,
    isLoading,
  };
};
