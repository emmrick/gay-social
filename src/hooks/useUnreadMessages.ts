import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCount {
  partnerId: string;
  count: number;
}

export const useUnreadMessages = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get unread counts for all conversations
  const query = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async (): Promise<UnreadCount[]> => {
      if (!user) return [];

      // Single query: get all unread private messages sent TO this user that haven't been read
      const { data: unreadMessages, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('is_private', true)
        .eq('recipient_id', user.id)
        .is('read_at', null)
        .is('deleted_at', null);

      if (error) throw error;
      if (!unreadMessages?.length) return [];

      // Count per sender in memory (much faster than N queries)
      const countMap = new Map<string, number>();
      for (const msg of unreadMessages) {
        countMap.set(msg.sender_id, (countMap.get(msg.sender_id) || 0) + 1);
      }

      return Array.from(countMap.entries()).map(([partnerId, count]) => ({
        partnerId,
        count,
      }));
    },
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 30000,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // Invalidate unread counts when new message arrives
          queryClient.invalidateQueries({ queryKey: ['unread-messages', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Mark conversation as read
  const markAsRead = useMutation({
    mutationFn: async (partnerId: string) => {
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      // Update message_read_status table
      const { error: statusError } = await supabase
        .from('message_read_status')
        .upsert({
          user_id: user.id,
          conversation_partner_id: partnerId,
          last_read_at: now,
        }, {
          onConflict: 'user_id,conversation_partner_id',
        });

      if (statusError) throw statusError;

      // CRITICAL: Also update read_at on actual messages for UI indicators
      const { error: messagesError } = await supabase
        .from('messages')
        .update({ read_at: now })
        .eq('is_private', true)
        .eq('sender_id', partnerId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (messagesError) {
        console.error('Error updating message read_at:', messagesError);
      }
    },
    onSuccess: (_, partnerId) => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages', user?.id] });
      // Force immediate refetch of private messages to update UI
      queryClient.invalidateQueries({ queryKey: ['private-messages', user?.id, partnerId] });
    },
  });

  // Mark conversation as unread (set last_read_at to a past date)
  const markAsUnread = useMutation({
    mutationFn: async (partnerId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Set last_read_at to epoch (very old date) to mark all messages as unread
      const { error } = await supabase
        .from('message_read_status')
        .upsert({
          user_id: user.id,
          conversation_partner_id: partnerId,
          last_read_at: '1970-01-01T00:00:00.000Z',
        }, {
          onConflict: 'user_id,conversation_partner_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages', user?.id] });
    },
  });

  // Get unread count for a specific partner
  const getUnreadCount = (partnerId: string): number => {
    const counts = query.data || [];
    const found = counts.find(c => c.partnerId === partnerId);
    return found?.count || 0;
  };

  // Get total unread count
  const getTotalUnreadCount = (): number => {
    const counts = query.data || [];
    return counts.reduce((sum, c) => sum + c.count, 0);
  };

  return {
    unreadCounts: query.data || [],
    isLoading: query.isLoading,
    getUnreadCount,
    getTotalUnreadCount,
    markAsRead,
    markAsUnread,
  };
};
