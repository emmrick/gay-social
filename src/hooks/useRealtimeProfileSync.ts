import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { presenceStore } from '@/stores/presenceStore';

/**
 * UNIFIED global realtime subscription for ALL profile changes.
 * Replaces useRealtimeOnlineStatus + useOnlineMemberCounts realtime + old useRealtimeProfileSync.
 *
 * - Updates the global presenceStore on every is_online / last_seen change
 *   (so every page using `useUserPresence(id)` re-renders instantly).
 * - Updates query caches for profile data (avatar, username, bio…).
 *
 * Mount ONCE at app level.
 */
export const useRealtimeProfileSync = () => {
  const queryClient = useQueryClient();
  const { user, refetchProfile } = useAuth();
  const lastInvalidateRef = useRef<number>(0);
  const lastCountInvalidateRef = useRef<number>(0);

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
          if (!changedUserId) return;

          const isAvatarChange = oldData?.avatar_url !== newData?.avatar_url;
          const isUsernameChange = oldData?.username !== newData?.username;
          const isBioChange = oldData?.bio !== newData?.bio;
          const isAgeChange = oldData?.age !== newData?.age;
          const isOnlineChange = oldData?.is_online !== newData?.is_online;
          const isLastSeenChange = oldData?.last_seen !== newData?.last_seen;
          const isProfileDataChange =
            isAvatarChange || isUsernameChange || isBioChange || isAgeChange;

          // 1) ALWAYS push presence into the global store so every component
          //    using useUserPresence(id) updates instantly across all pages.
          if (isOnlineChange || isLastSeenChange) {
            presenceStore.set(changedUserId, {
              is_online: newData?.is_online ?? null,
              last_seen: newData?.last_seen ?? null,
              hide_online_status: newData?.hide_online_status ?? false,
              hide_last_seen: newData?.hide_last_seen ?? false,
            });
          }

          // 2) Own profile data change → refresh AuthContext
          if (changedUserId === user.id && isProfileDataChange) {
            refetchProfile();
          }

          // 3) Profile data changes → update single profile cache + debounce list invalidations
          if (isProfileDataChange) {
            queryClient.setQueryData(['profile', changedUserId], (old: any) =>
              old ? { ...old, ...newData } : old
            );
            const now = Date.now();
            if (now - lastInvalidateRef.current > 10000) {
              lastInvalidateRef.current = now;
              queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
              queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
            }
          }

          // 4) Online status change → refresh online counters (throttled 30s)
          if (isOnlineChange) {
            const now = Date.now();
            if (now - lastCountInvalidateRef.current > 30000) {
              lastCountInvalidateRef.current = now;
              queryClient.invalidateQueries({ queryKey: ['online-member-counts'] });
              queryClient.invalidateQueries({ queryKey: ['online-member-count'] });
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
