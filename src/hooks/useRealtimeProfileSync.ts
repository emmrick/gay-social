import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Global hook that listens for ANY profile changes via Supabase Realtime
 * and invalidates all related queries across the entire app.
 * 
 * Mount this ONCE at the app level (e.g., in AppContent).
 */
export const useRealtimeProfileSync = () => {
  const queryClient = useQueryClient();
  const { user, refetchProfile } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-profile-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const { old: oldData, new: newData } = payload;

          // Only react to meaningful changes (not heartbeat updates like last_seen/is_online)
          const isAvatarChange = oldData?.avatar_url !== newData?.avatar_url;
          const isUsernameChange = oldData?.username !== newData?.username;
          const isBioChange = oldData?.bio !== newData?.bio;
          const isAgeChange = oldData?.age !== newData?.age;
          const isOnlineChange = oldData?.is_online !== newData?.is_online;
          const isProfileDataChange = isAvatarChange || isUsernameChange || isBioChange || isAgeChange;

          // If this is the current user's own profile change, refresh AuthContext profile
          if (newData?.user_id === user.id && isProfileDataChange) {
            refetchProfile();
          }

          // For avatar/username/bio changes, invalidate ALL profile-related queries
          if (isProfileDataChange) {
            const changedUserId = newData?.user_id;

            // Invalidate specific profile query and force refetch
            queryClient.invalidateQueries({ queryKey: ['profile', changedUserId] });
            
            // Invalidate all list-based queries that display profile data
            queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['private-messages'] });
            queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
            queryClient.invalidateQueries({ queryKey: ['nearby-profiles'] });
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['profile-photos'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
          }

          // For online status changes only, just update conversations and favorites
          if (isOnlineChange && !isProfileDataChange) {
            queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, refetchProfile]);
};
