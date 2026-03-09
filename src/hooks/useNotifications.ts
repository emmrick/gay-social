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

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pollIntervalRef = useRef(10000);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<string | null>(null);

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
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
  }, [queryClient, user?.id]);

  // Realtime subscription + polling fallback
  useEffect(() => {
    if (!user?.id) return;

    // Primary: Realtime
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
        () => {
          pollIntervalRef.current = 10000; // Reset backoff on new notification
          invalidateAll();
        }
      )
      .subscribe();

    // Fallback: Polling with exponential backoff
    const poll = async () => {
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
          pollIntervalRef.current = 10000; // Reset backoff when new notifications found
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
    staleTime: 15_000,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
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
