import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * UNIFIED global realtime subscription for ALL profile changes.
 * Replaces useRealtimeOnlineStatus + useOnlineMemberCounts realtime + old useRealtimeProfileSync.
 * 
 * Mount ONCE at app level.
 */
export const useRealtimeProfileSync = () => {
  const queryClient = useQueryClient();
  const { user, refetchProfile } = useAuth();
  const lastInvalidateRef = useRef<number>(0);

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
          const changedUserId = newData?.user_id;

          const isAvatarChange = oldData?.avatar_url !== newData?.avatar_url;
          const isUsernameChange = oldData?.username !== newData?.username;
          const isBioChange = oldData?.bio !== newData?.bio;
          const isAgeChange = oldData?.age !== newData?.age;
          const isOnlineChange = oldData?.is_online !== newData?.is_online;
          const isProfileDataChange = isAvatarChange || isUsernameChange || isBioChange || isAgeChange;

          // Own profile data change → refresh AuthContext
          if (changedUserId === user.id && isProfileDataChange) {
            refetchProfile();
          }

          // Profile data changes (avatar, username, etc.) → invalidate profile-related queries
          if (isProfileDataChange) {
            queryClient.invalidateQueries({ queryKey: ['profile', changedUserId] });
            // Batch: only invalidate lists if not done recently (debounce 2s)
            const now = Date.now();
            if (now - lastInvalidateRef.current > 2000) {
              lastInvalidateRef.current = now;
              queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
              queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
              queryClient.invalidateQueries({ queryKey: ['nearby-profiles'] });
              queryClient.invalidateQueries({ queryKey: ['profiles'] });
            }
          }

          // Online status change → lightweight invalidation (throttled)
          if (isOnlineChange && !isProfileDataChange) {
            const now = Date.now();
            if (now - lastInvalidateRef.current > 5000) {
              lastInvalidateRef.current = now;
              queryClient.invalidateQueries({ queryKey: ['online-member-counts'] });
              queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, refetchProfile]);
};
