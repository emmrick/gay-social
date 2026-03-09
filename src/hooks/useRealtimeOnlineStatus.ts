/**
 * @deprecated – Merged into useRealtimeProfileSync.
 * Kept as a no-op export so existing imports don't break.
 */
export const useRealtimeOnlineStatus = () => {
  // No-op: all realtime profile logic now lives in useRealtimeProfileSync
};

export const useRealtimeUserOnlineStatus = (_userId: string | undefined) => {
  // No-op: individual user status updates are covered by the global subscription
};
