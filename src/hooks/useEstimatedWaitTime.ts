import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WaitTimeResult {
  position: number;
  estimatedMinutes: number | null;
  onlineModerators: number;
  found: boolean;
  isLoading: boolean;
}

export const useEstimatedWaitTime = (entityId: string | null): WaitTimeResult => {
  const { data, isLoading } = useQuery({
    queryKey: ['estimated-wait-time', entityId],
    queryFn: async () => {
      if (!entityId) return null;
      const { data, error } = await supabase.rpc('get_estimated_wait_time' as any, {
        _entity_id: entityId,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!entityId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    position: data?.position ?? 0,
    estimatedMinutes: data?.estimated_minutes ?? null,
    onlineModerators: data?.online_moderators ?? 0,
    found: data?.found ?? false,
    isLoading,
  };
};
