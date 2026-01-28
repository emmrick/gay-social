import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedStatus = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['blocked-status', user?.id],
    queryFn: async () => {
      if (!user) return { isBlocked: false, blockInfo: null };

      // Check if user is blocked
      const { data: blockData, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking block status:', error);
        return { isBlocked: false, blockInfo: null };
      }

      return {
        isBlocked: !!blockData,
        blockInfo: blockData,
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Check every minute
  });

  return {
    isBlocked: query.data?.isBlocked || false,
    blockInfo: query.data?.blockInfo || null,
    isLoading: query.isLoading,
  };
};
