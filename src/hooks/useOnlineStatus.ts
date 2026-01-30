/**
 * Utility functions to determine if a user is truly online
 * A user is considered truly online if:
 * 1. Their is_online flag is true
 * 2. Their last_seen timestamp is within the last 5 minutes
 */

const ONLINE_THRESHOLD_MINUTES = 5;

interface ProfileWithStatus {
  is_online?: boolean | null;
  last_seen?: string | null;
  hide_online_status?: boolean | null;
  hide_last_seen?: boolean | null;
}

/**
 * Check if a user is truly online based on is_online flag AND last_seen timestamp
 */
export const isUserTrulyOnline = (profile: ProfileWithStatus | null | undefined): boolean => {
  if (!profile) return false;
  if (profile.is_online !== true) return false;
  if (!profile.last_seen) return false;
  
  const diff = Date.now() - new Date(profile.last_seen).getTime();
  const minutes = diff / 60000;
  
  // Consider online only if last seen within threshold
  return minutes < ONLINE_THRESHOLD_MINUTES;
};

/**
 * Check if we should display the online status indicator for a user
 */
export const shouldShowOnlineIndicator = (profile: ProfileWithStatus | null | undefined): boolean => {
  if (!profile) return false;
  if (profile.hide_online_status) return false;
  return isUserTrulyOnline(profile);
};

/**
 * Get a human-readable "last seen" text for a user
 */
export const getLastSeenText = (
  profile: ProfileWithStatus | null | undefined,
  options?: { prefix?: string }
): string | null => {
  if (!profile) return 'Hors ligne';
  
  const prefix = options?.prefix ?? '';
  
  // If hiding both statuses, return null (show nothing)
  if (profile.hide_online_status && profile.hide_last_seen) return null;
  
  // If truly online and not hidden, return null (will show online indicator instead)
  if (!profile.hide_online_status && isUserTrulyOnline(profile)) return null;
  
  // If hiding last seen, just show "Hors ligne"
  if (profile.hide_last_seen) return 'Hors ligne';
  
  if (!profile.last_seen) return 'Hors ligne';
  
  const diff = Date.now() - new Date(profile.last_seen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 5) return `${prefix}À l'instant`;
  if (minutes < 60) return `${prefix}${minutes}min`;
  if (hours < 24) return `${prefix}${hours}h`;
  return `${prefix}${days}j`;
};

/**
 * Get detailed last seen text with "Vu il y a" prefix
 */
export const getDetailedLastSeenText = (profile: ProfileWithStatus | null | undefined): string => {
  if (!profile) return 'Hors ligne';
  
  if (isUserTrulyOnline(profile) && !profile.hide_online_status) {
    return 'En ligne maintenant';
  }
  
  if (profile.hide_last_seen) return 'Hors ligne';
  if (!profile.last_seen) return 'Hors ligne';
  
  const diff = Date.now() - new Date(profile.last_seen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 5) return 'Vu à l\'instant';
  if (minutes < 60) return `Vu il y a ${minutes} min`;
  if (hours < 24) return `Vu il y a ${hours}h`;
  return `Vu il y a ${days}j`;
};
