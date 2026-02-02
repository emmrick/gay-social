import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BroadcastNotification {
  id: string;
  title: string;
  body: string | null;
  action_url: string | null;
  target_type: string;
  target_region: string | null;
  sent_by: string;
  success_count: number;
  failed_count: number;
  total_subscriptions: number;
  created_at: string;
}

export const useBroadcastHistory = () => {
  return useQuery({
    queryKey: ['broadcast-history'],
    queryFn: async (): Promise<BroadcastNotification[]> => {
      const { data, error } = await supabase
        .from('broadcast_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as BroadcastNotification[];
    },
  });
};
