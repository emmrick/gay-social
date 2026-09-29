import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedStatus = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['blocked-status', user?.id],
    queryFn: async () => {
      if (!user) return { isBlocked: false, blockInfo: null, isSuspendedByAI: false };

      // Check if user is blocked
      const { data: blockData, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking block status:', error);
        return { isBlocked: false, blockInfo: null, isSuspendedByAI: false };
      }

      // Check if this is an AI-triggered suspension (temporary with reason containing "automatique")
      const isSuspendedByAI = blockData && 
        blockData.suspension_type === 'temporary' && 
        (blockData.reason?.includes('automatique') || blockData.reason?.includes('Signalement'));

      return {
        isBlocked: !!blockData && blockData.suspension_type === 'permanent',
        isSuspendedByAI: !!isSuspendedByAI,
        blockInfo: blockData,
      };
    },
    enabled: !!user,
    refetchInterval: 600000, // Check every 10 minutes
  });

  return {
    isBlocked: query.data?.isBlocked || false,
    isSuspendedByAI: query.data?.isSuspendedByAI || false,
    blockInfo: query.data?.blockInfo || null,
    isLoading: query.isLoading,
  };
};
