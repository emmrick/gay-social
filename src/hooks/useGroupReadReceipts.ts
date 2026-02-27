import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReadReceipt {
  user_id: string;
  read_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface GroupedReadReceipts {
  [messageId: string]: ReadReceipt[];
}

export const useGroupReadReceipts = (chatRoomId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch read receipts for all messages in the room
  const { data: readReceipts } = useQuery({
    queryKey: ['group-read-receipts', chatRoomId],
    queryFn: async (): Promise<GroupedReadReceipts> => {
      if (!chatRoomId) return {};

      // Get message IDs for this room
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_room_id', chatRoomId)
        .eq('is_private', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!messages?.length) return {};

      const messageIds = messages.map(m => m.id);

      // Get read receipts
      const { data: receipts } = await supabase
        .from('group_message_reads')
        .select('message_id, user_id, read_at')
        .in('message_id', messageIds);

      if (!receipts?.length) return {};

      // Get unique user IDs for profiles
      const userIds = [...new Set(receipts.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Group by message ID
      const grouped: GroupedReadReceipts = {};
      for (const receipt of receipts) {
        if (!grouped[receipt.message_id]) {
          grouped[receipt.message_id] = [];
        }
        const profile = profileMap.get(receipt.user_id);
        grouped[receipt.message_id].push({
          user_id: receipt.user_id,
          read_at: receipt.read_at,
          username: profile?.username,
          avatar_url: profile?.avatar_url,
        });
      }

      return grouped;
    },
    enabled: !!chatRoomId,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // Mark messages as read when viewing the chat
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!user?.id || !messageIds.length) return;

    // Batch insert read receipts (ignore conflicts)
    const inserts = messageIds.map(messageId => ({
      message_id: messageId,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('group_message_reads')
      .upsert(inserts, { onConflict: 'message_id,user_id', ignoreDuplicates: true });

    if (!error) {
      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: ['group-read-receipts', chatRoomId] });
    }
  }, [user?.id, chatRoomId, queryClient]);

  // Real-time subscription for read receipts
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`read-receipts-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_message_reads',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group-read-receipts', chatRoomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, queryClient]);

  // Get read receipts for a specific message
  const getReaders = useCallback((messageId: string): ReadReceipt[] => {
    return (readReceipts || {})[messageId] || [];
  }, [readReceipts]);

  return {
    readReceipts: readReceipts || {},
    markAsRead,
    getReaders,
  };
};
