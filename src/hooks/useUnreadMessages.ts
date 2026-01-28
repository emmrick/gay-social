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

      // Get all private conversations
      const { data: conversations } = await supabase
        .from('private_conversations')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!conversations?.length) return [];

      // Get read status for all conversations
      const { data: readStatuses } = await supabase
        .from('message_read_status')
        .select('conversation_partner_id, last_read_at')
        .eq('user_id', user.id);

      const readStatusMap = new Map(
        readStatuses?.map(rs => [rs.conversation_partner_id, new Date(rs.last_read_at)]) || []
      );

      // Count unread messages for each conversation
      const unreadCounts: UnreadCount[] = [];

      for (const conv of conversations) {
        const partnerId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const lastReadAt = readStatusMap.get(partnerId);

        // Build query for unread messages from this partner
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('is_private', true)
          .eq('sender_id', partnerId)
          .eq('recipient_id', user.id);

        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt.toISOString());
        }

        const { count } = await query;

        if (count && count > 0) {
          unreadCounts.push({ partnerId, count });
        }
      }

      return unreadCounts;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
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

      const { error } = await supabase
        .from('message_read_status')
        .upsert({
          user_id: user.id,
          conversation_partner_id: partnerId,
          last_read_at: new Date().toISOString(),
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
  };
};
