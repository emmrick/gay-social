import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivePromotion {
  id: string;
  label: string;
  description: string | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
}

/**
 * Hook to fetch the currently active credit promotion (if any).
 * Refetches every minute to ensure the badge expires accurately.
 * Subscribes to realtime changes on credit_promotions for instant updates.
 */
export const useActivePromotion = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['active-credit-promotion'],
    queryFn: async (): Promise<ActivePromotion | null> => {
      const { data, error } = await supabase.rpc('get_active_credit_promotion');
      if (error) {
        console.warn('Failed to fetch active promotion:', error);
        return null;
      }
      const list = (data as unknown as ActivePromotion[]) || [];
      return list.length > 0 ? list[0] : null;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('credit-promotions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_promotions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-credit-promotion'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    promotion: query.data ?? null,
    isLoading: query.isLoading,
    hasActivePromotion: !!query.data,
  };
};
