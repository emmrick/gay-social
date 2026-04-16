/**
 * Live presence hook — merges a profile-like object with the global presenceStore
 * so every page (Home, Visits, Reactions, Messages, Swipe, Admin) reflects
 * realtime status without prop drilling or manual subscriptions.
 */
import { useMemo } from 'react';
import { useUserPresence } from '@/stores/presenceStore';
import {
  isUserTrulyOnline,
  shouldShowOnlineIndicator,
  getLastSeenText,
  getDetailedLastSeenText,
} from '@/hooks/useOnlineStatus';

interface ProfileLike {
  user_id?: string | null;
  is_online?: boolean | null;
  last_seen?: string | null;
  hide_online_status?: boolean | null;
  hide_last_seen?: boolean | null;
}

export const useLivePresence = (profile: ProfileLike | null | undefined) => {
  const live = useUserPresence(profile?.user_id ?? undefined);

  return useMemo(() => {
    const merged = {
      is_online: live?.is_online ?? profile?.is_online ?? null,
      last_seen: live?.last_seen ?? profile?.last_seen ?? null,
      hide_online_status:
        live?.hide_online_status ?? profile?.hide_online_status ?? false,
      hide_last_seen: live?.hide_last_seen ?? profile?.hide_last_seen ?? false,
    };

    return {
      ...merged,
      isOnline: isUserTrulyOnline(merged),
      showIndicator: shouldShowOnlineIndicator(merged),
      lastSeenText: getLastSeenText(merged),
      detailedLastSeenText: getDetailedLastSeenText(merged),
    };
  }, [
    live?.is_online,
    live?.last_seen,
    live?.hide_online_status,
    live?.hide_last_seen,
    profile?.is_online,
    profile?.last_seen,
    profile?.hide_online_status,
    profile?.hide_last_seen,
  ]);
};
