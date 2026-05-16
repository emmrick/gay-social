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

/** Au-delà de ce seuil, on affiche simplement « Hors ligne ». */
const OFFLINE_LABEL_THRESHOLD_DAYS = 7;

/**
 * Get a human-readable "last seen" text for a user.
 * - En ligne : null (l'indicateur vert s'affiche à la place)
 * - < 7 jours : durée écoulée (À l'instant, 12min, 3h, 2j…)
 * - >= 7 jours ou inconnu : « Hors ligne »
 */
export const getLastSeenText = (
  profile: ProfileWithStatus | null | undefined,
  options?: { prefix?: string }
): string | null => {
  if (!profile) return 'Hors ligne';

  const prefix = options?.prefix ?? '';

  if (profile.hide_online_status && profile.hide_last_seen) return null;
  if (!profile.hide_online_status && isUserTrulyOnline(profile)) return null;
  if (profile.hide_last_seen) return 'Hors ligne';
  if (!profile.last_seen) return 'Hors ligne';

  const diff = Date.now() - new Date(profile.last_seen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days >= OFFLINE_LABEL_THRESHOLD_DAYS) return 'Hors ligne';
  if (minutes < 5) return `${prefix}À l'instant`;
  if (minutes < 60) return `${prefix}${minutes}min`;
  if (hours < 24) return `${prefix}${hours}h`;
  return `${prefix}${days}j`;
};

/**
 * Detailed variant with "Vu il y a" prefix.
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

  if (days >= OFFLINE_LABEL_THRESHOLD_DAYS) return 'Hors ligne';
  if (minutes < 5) return 'Vu à l\'instant';
  if (minutes < 60) return `Vu il y a ${minutes} min`;
  if (hours < 24) return `Vu il y a ${hours}h`;
  return `Vu il y a ${days}j`;
};

