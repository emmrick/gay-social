import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { presenceStore } from '@/stores/presenceStore';

/**
 * Presence with (almost) ZERO database usage.
 *
 * Instead of writing `profiles.is_online` every 60s (which also fanned out a
 * realtime UPDATE to every connected client → N² messages + constant DB CPU),
 * we use Supabase Realtime Presence: state lives in memory on the realtime
 * server and is broadcast once per join/leave.
 *
 * The database is only touched:
 *  - once when the session starts (is_online = true)
 *  - at most once every 15 minutes while the tab stays open
 *  - once when the tab is hidden / closed (last_seen refresh)
 */
const DB_SYNC_INTERVAL = 15 * 60 * 1000; // 15 min
const PRESENCE_CHANNEL = 'online-users';

export const useOnlineHeartbeat = (user: User | null) => {
  useEffect(() => {
    if (!user) return;

    let lastDbWrite = 0;
    let cancelled = false;

    const writeDb = async (isOnline: boolean) => {
      lastDbWrite = Date.now();
      try {
        await supabase
          .from('profiles')
          .update({ is_online: isOnline, last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch {
        // Ignore — presence stays accurate in memory anyway
      }
    };

    const maybeWriteDb = (isOnline: boolean) => {
      if (cancelled) return;
      if (Date.now() - lastDbWrite < DB_SYNC_INTERVAL) return;
      void writeDb(isOnline);
    };

    // Initial (single) write so profiles stay coherent for server-side queries
    void writeDb(true);

    // ---- In-memory presence (no DB, no per-row realtime events) ----
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } },
    });

    const applyPresenceState = () => {
      const state = channel.presenceState<{ user_id?: string; at?: string }>();
      const now = new Date().toISOString();
      Object.entries(state).forEach(([key, entries]) => {
        const id = (entries?.[0] as { user_id?: string })?.user_id || key;
        if (id) presenceStore.set(id, { is_online: true, last_seen: now });
      });
    };

    channel
      .on('presence', { event: 'sync' }, applyPresenceState)
      .on('presence', { event: 'join' }, applyPresenceState)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const now = new Date().toISOString();
        (leftPresences as Array<{ user_id?: string }>).forEach((p) => {
          if (p?.user_id) presenceStore.set(p.user_id, { is_online: false, last_seen: now });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, at: new Date().toISOString() });
        }
      });

    // Very low-frequency DB refresh so "last_seen" isn't stale for offline logic
    const dbInterval = setInterval(() => {
      if (document.visibilityState === 'visible') maybeWriteDb(true);
    }, DB_SYNC_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void channel.track({ user_id: user.id, at: new Date().toISOString() });
        maybeWriteDb(true);
      } else {
        maybeWriteDb(true);
      }
    };

    const handleBeforeUnload = () => {
      try {
        void channel.untrack();
      } catch {
        // Ignore errors during unload
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      clearInterval(dbInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);
    };
  }, [user]);
};
