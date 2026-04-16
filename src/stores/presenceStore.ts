/**
 * Global presence store — single source of truth for live online/last_seen
 * across the entire app. Updated by useRealtimeProfileSync from postgres_changes
 * on the `profiles` table.
 *
 * Components subscribe via `useUserPresence(userId)` which only re-renders when
 * THAT user's presence changes (no global re-renders).
 */

import { useSyncExternalStore } from 'react';

export interface PresenceEntry {
  is_online: boolean | null;
  last_seen: string | null;
  hide_online_status?: boolean | null;
  hide_last_seen?: boolean | null;
  updated_at: number; // local ms timestamp
}

type Listener = () => void;

const presenceMap = new Map<string, PresenceEntry>();
const userListeners = new Map<string, Set<Listener>>();
const globalListeners = new Set<Listener>();

const notifyUser = (userId: string) => {
  const ls = userListeners.get(userId);
  if (ls) ls.forEach((l) => l());
  globalListeners.forEach((l) => l());
};

export const presenceStore = {
  set(userId: string, entry: Partial<PresenceEntry>) {
    if (!userId) return;
    const prev = presenceMap.get(userId);
    const next: PresenceEntry = {
      is_online: entry.is_online ?? prev?.is_online ?? null,
      last_seen: entry.last_seen ?? prev?.last_seen ?? null,
      hide_online_status: entry.hide_online_status ?? prev?.hide_online_status ?? false,
      hide_last_seen: entry.hide_last_seen ?? prev?.hide_last_seen ?? false,
      updated_at: Date.now(),
    };
    // Skip notify if nothing relevant changed
    if (
      prev &&
      prev.is_online === next.is_online &&
      prev.last_seen === next.last_seen &&
      prev.hide_online_status === next.hide_online_status &&
      prev.hide_last_seen === next.hide_last_seen
    ) {
      return;
    }
    presenceMap.set(userId, next);
    notifyUser(userId);
  },

  get(userId: string): PresenceEntry | undefined {
    return presenceMap.get(userId);
  },

  subscribeUser(userId: string, listener: Listener): () => void {
    let ls = userListeners.get(userId);
    if (!ls) {
      ls = new Set();
      userListeners.set(userId, ls);
    }
    ls.add(listener);
    return () => {
      ls!.delete(listener);
      if (ls!.size === 0) userListeners.delete(userId);
    };
  },

  subscribeAll(listener: Listener): () => void {
    globalListeners.add(listener);
    return () => globalListeners.delete(listener);
  },
};

/**
 * Subscribe to a single user's live presence.
 * Returns the latest entry (or undefined if never seen).
 */
export const useUserPresence = (userId: string | null | undefined): PresenceEntry | undefined => {
  return useSyncExternalStore(
    (cb) => (userId ? presenceStore.subscribeUser(userId, cb) : () => {}),
    () => (userId ? presenceStore.get(userId) : undefined),
    () => undefined
  );
};
