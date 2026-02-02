import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadMention {
  chatRoomId: string;
  count: number;
}

export const useUnreadMentions = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const query = useQuery({
    queryKey: ['unread-mentions', user?.id],
    queryFn: async (): Promise<UnreadMention[]> => {
      if (!user || !profile?.username) return [];

      // Get last read timestamps for each chat room (stored in localStorage for now)
      const lastReadKey = `mentions-read-${user.id}`;
      const lastReadData = localStorage.getItem(lastReadKey);
      const lastReadMap: Record<string, string> = lastReadData ? JSON.parse(lastReadData) : {};

      // Get all group messages that mention the user
      const mentionPattern = `@${profile.username.toLowerCase()}`;
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, chat_room_id, created_at, content')
        .eq('is_private', false)
        .is('deleted_at', null)
        .neq('sender_id', user.id)
        .ilike('content', `%${mentionPattern}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching unread mentions:', error);
        return [];
      }

      // Count mentions per chat room that are newer than last read
      const mentionCounts: Record<string, number> = {};

      for (const msg of messages || []) {
        if (!msg.chat_room_id) continue;
        
        const lastRead = lastReadMap[msg.chat_room_id];
        const messageTime = new Date(msg.created_at).getTime();
        const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

        if (messageTime > lastReadTime) {
          mentionCounts[msg.chat_room_id] = (mentionCounts[msg.chat_room_id] || 0) + 1;
        }
      }

      return Object.entries(mentionCounts).map(([chatRoomId, count]) => ({
        chatRoomId,
        count,
      }));
    },
    enabled: !!user && !!profile?.username,
    refetchInterval: 30000,
  });

  // Real-time subscription for new mentions
  useEffect(() => {
    if (!user || !profile?.username) return;

    const channel = supabase
      .channel(`mentions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as { content: string; sender_id: string; is_private: boolean };
          
          // Check if it's a group message mentioning us
          if (
            !newMsg.is_private &&
            newMsg.sender_id !== user.id &&
            newMsg.content?.toLowerCase().includes(`@${profile.username.toLowerCase()}`)
          ) {
            queryClient.invalidateQueries({ queryKey: ['unread-mentions', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.username, queryClient]);

  // Mark mentions as read for a specific chat room
  const markMentionsAsRead = (chatRoomId: string) => {
    if (!user) return;

    const lastReadKey = `mentions-read-${user.id}`;
    const lastReadData = localStorage.getItem(lastReadKey);
    const lastReadMap: Record<string, string> = lastReadData ? JSON.parse(lastReadData) : {};

    lastReadMap[chatRoomId] = new Date().toISOString();
    localStorage.setItem(lastReadKey, JSON.stringify(lastReadMap));

    // Invalidate to update counts
    queryClient.invalidateQueries({ queryKey: ['unread-mentions', user.id] });
  };

  // Get mention count for a specific chat room
  const getMentionCount = (chatRoomId: string): number => {
    const mentions = query.data || [];
    const found = mentions.find(m => m.chatRoomId === chatRoomId);
    return found?.count || 0;
  };

  // Get total mention count
  const getTotalMentionCount = (): number => {
    const mentions = query.data || [];
    return mentions.reduce((sum, m) => sum + m.count, 0);
  };

  return {
    unreadMentions: query.data || [],
    isLoading: query.isLoading,
    getMentionCount,
    getTotalMentionCount,
    markMentionsAsRead,
  };
};
