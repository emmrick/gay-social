import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

// BroadcastChannel for cross-tab sync
const notificationChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('notifications-sync')
  : null;

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pollIntervalRef = useRef(10000);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<string | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data?.length) {
        lastSyncRef.current = data[0].created_at;
        // Track known IDs for deduplication
        knownIdsRef.current = new Set(data.map(n => n.id));
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
  }, [queryClient, user?.id]);

  // Cross-tab sync listener
  useEffect(() => {
    if (!notificationChannel || !user?.id) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.userId === user.id) {
        invalidateAll();
      }
    };

    notificationChannel.addEventListener('message', handler);
    return () => notificationChannel.removeEventListener('message', handler);
  }, [user?.id, invalidateAll]);

  // Visibility-based resync: refetch when tab becomes visible
  useEffect(() => {
    if (!user?.id) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Reset polling interval on tab focus
        pollIntervalRef.current = 10000;
        invalidateAll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, invalidateAll]);

  // Realtime subscription (INSERT + UPDATE) + polling fallback
  useEffect(() => {
    if (!user?.id) return;

    // Primary: Realtime for INSERT and UPDATE
    const channel = supabase
      .channel(`notifications-rt-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Deduplication: skip if already known
          if (knownIdsRef.current.has(newNotif.id)) return;
          knownIdsRef.current.add(newNotif.id);
          pollIntervalRef.current = 10000;
          invalidateAll();
          // Notify other tabs
          notificationChannel?.postMessage({ userId: user.id, action: 'new' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Sync read status across tabs
          invalidateAll();
          notificationChannel?.postMessage({ userId: user.id, action: 'update' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          invalidateAll();
          notificationChannel?.postMessage({ userId: user.id, action: 'delete' });
        }
      )
      .subscribe();

    // Fallback: Polling with exponential backoff (only when tab visible)
    const poll = async () => {
      // Skip polling if tab is hidden to save resources
      if (document.visibilityState === 'hidden') {
        timeoutRef.current = setTimeout(poll, pollIntervalRef.current);
        return;
      }

      try {
        let q = supabase
          .from('notifications')
          .select('id, created_at', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (lastSyncRef.current) {
          q = q.gt('created_at', lastSyncRef.current);
        }

        const { count } = await q;

        if (count && count > 0) {
          pollIntervalRef.current = 10000;
          invalidateAll();
        } else {
          pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 60000);
        }
      } catch {
        pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 60000);
      } finally {
        timeoutRef.current = setTimeout(poll, pollIntervalRef.current);
      }
    };

    timeoutRef.current = setTimeout(poll, pollIntervalRef.current);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, invalidateAll]);

  return query;
};

export const useUnreadNotificationsCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count', user?.id] });

      const prevNotifications = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      const prevCount = queryClient.getQueryData<number>(['notifications-unread-count', user?.id]);

      if (prevNotifications) {
        queryClient.setQueryData<Notification[]>(['notifications', user?.id],
          prevNotifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
      if (typeof prevCount === 'number' && prevCount > 0) {
        queryClient.setQueryData<number>(['notifications-unread-count', user?.id], prevCount - 1);
      }

      return { prevNotifications, prevCount };
    },
    onError: (_err, _id, context) => {
      if (context?.prevNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.prevNotifications);
      }
      if (typeof context?.prevCount === 'number') {
        queryClient.setQueryData(['notifications-unread-count', user?.id], context.prevCount);
      }
    },
    onSettled: () => {
      notificationChannel?.postMessage({ userId: user?.id, action: 'read' });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });

      const prevNotifications = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      const prevCount = queryClient.getQueryData<number>(['notifications-unread-count', user?.id]);

      if (prevNotifications) {
        queryClient.setQueryData<Notification[]>(['notifications', user?.id],
          prevNotifications.map(n => ({ ...n, is_read: true }))
        );
      }
      queryClient.setQueryData<number>(['notifications-unread-count', user?.id], 0);

      return { prevNotifications, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.prevNotifications);
      }
      if (typeof context?.prevCount === 'number') {
        queryClient.setQueryData(['notifications-unread-count', user?.id], context.prevCount);
      }
    },
    onSettled: () => {
      notificationChannel?.postMessage({ userId: user?.id, action: 'read-all' });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });

      const prevNotifications = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      const prevCount = queryClient.getQueryData<number>(['notifications-unread-count', user?.id]);

      if (prevNotifications) {
        const removed = prevNotifications.find(n => n.id === notificationId);
        queryClient.setQueryData<Notification[]>(['notifications', user?.id],
          prevNotifications.filter(n => n.id !== notificationId)
        );
        if (removed && !removed.is_read && typeof prevCount === 'number') {
          queryClient.setQueryData<number>(['notifications-unread-count', user?.id], Math.max(0, prevCount - 1));
        }
      }

      return { prevNotifications, prevCount };
    },
    onError: (_err, _id, context) => {
      if (context?.prevNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.prevNotifications);
      }
      if (typeof context?.prevCount === 'number') {
        queryClient.setQueryData(['notifications-unread-count', user?.id], context.prevCount);
      }
    },
    onSettled: () => {
      notificationChannel?.postMessage({ userId: user?.id, action: 'delete' });
    },
  });
};

export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async () => {
      const prevNotifications = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      const prevCount = queryClient.getQueryData<number>(['notifications-unread-count', user?.id]);

      queryClient.setQueryData<Notification[]>(['notifications', user?.id], []);
      queryClient.setQueryData<number>(['notifications-unread-count', user?.id], 0);

      return { prevNotifications, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.prevNotifications);
      }
      if (typeof context?.prevCount === 'number') {
        queryClient.setQueryData(['notifications-unread-count', user?.id], context.prevCount);
      }
    },
    onSettled: () => {
      notificationChannel?.postMessage({ userId: user?.id, action: 'clear' });
    },
  });
};

export const useCreateNotification = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      type,
      title,
      message,
      actionUrl,
    }: {
      userId: string;
      type: string;
      title: string;
      message?: string;
      actionUrl?: string;
    }) => {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        message: message || null,
        action_url: actionUrl || null,
      });

      if (error) throw error;
    },
  });
};
