/**
 * Admin Realtime Bridge.
 * Subscribes once (mount in <Admin/> page) to Postgres changes that matter
 * for admin views and pushes updates into the centralized adminStore.
 * - profiles : keep user list & stats fresh
 * - reports  : update pending reports counter
 * - moderation_tasks : update task list
 *
 * Uses Supabase Realtime. Cleans up channels on unmount.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminStore } from '@/stores/admin/useAdminStore';

export const useAdminRealtimeBridge = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    const store = useAdminStore.getState;

    const profilesCh = supabase
      .channel('admin-profiles-bridge')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new as any;
          if (!row?.user_id) return;
          store().upsertUser({
            user_id: row.user_id,
            is_online: row.is_online,
            last_seen: row.last_seen,
            is_verified: row.is_verified,
            is_premium: row.is_premium,
            avatar_url: row.avatar_url,
            username: row.username,
            region: row.region,
            hide_online_status: row.hide_online_status,
            hide_last_seen: row.hide_last_seen,
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => {
          store().bumpStat('usersTotal', 1);
          store().bumpStat('signupsToday', 1);
        },
      )
      .subscribe();

    const reportsCh = supabase
      .channel('admin-reports-bridge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          const evt = payload.eventType;
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (evt === 'INSERT' && newRow?.status === 'pending') {
            store().bumpStat('reportsPending', 1);
          } else if (evt === 'UPDATE') {
            if (oldRow?.status === 'pending' && newRow?.status !== 'pending') {
              store().bumpStat('reportsPending', -1);
            } else if (oldRow?.status !== 'pending' && newRow?.status === 'pending') {
              store().bumpStat('reportsPending', 1);
            }
          }
          // Refresh reports list (cheap with cache)
          store().fetchReports('pending', { force: true });
        },
      )
      .subscribe();

    const tasksCh = supabase
      .channel('admin-tasks-bridge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moderation_tasks' },
        () => {
          store().fetchTasks('pending', { force: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesCh);
      supabase.removeChannel(reportsCh);
      supabase.removeChannel(tasksCh);
    };
  }, [enabled]);
};
