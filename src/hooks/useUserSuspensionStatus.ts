import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if a specific user is blocked or suspended
 * Used to hide profiles and prevent interactions with suspended users
 */
export const useUserSuspensionStatus = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-suspension-status', userId],
    queryFn: async (): Promise<{ isBlocked: boolean; isSuspended: boolean }> => {
      if (!userId) {
        return { isBlocked: false, isSuspended: false };
      }

      // Check if user is blocked
      const { data: blockedData } = await supabase
        .rpc('is_user_blocked', { _user_id: userId });
      
      // Check if user is suspended
      const { data: suspendedData } = await supabase
        .rpc('is_user_suspended', { _user_id: userId });

      return {
        isBlocked: blockedData === true,
        isSuspended: suspendedData === true,
      };
    },
    enabled: !!userId,
    staleTime: 30000, // Cache for 30 seconds
  });
};

export default useUserSuspensionStatus;
