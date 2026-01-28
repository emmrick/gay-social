import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type Message = Tables<'messages'>;

interface PrivateMessageWithProfile extends Message {
  senderUsername: string;
  senderAvatar: string | null;
}

export const usePrivateMessages = (otherUserId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['private-messages', user?.id, otherUserId],
    queryFn: async (): Promise<PrivateMessageWithProfile[]> => {
      if (!user || !otherUserId) return [];

      // Get messages between the two users
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('is_private', true)
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (!messages) return [];

      // Get profiles for both users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', [user.id, otherUserId]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return messages.map(msg => ({
        ...msg,
        senderUsername: profileMap.get(msg.sender_id)?.username || 'Anonyme',
        senderAvatar: profileMap.get(msg.sender_id)?.avatar_url || null,
      }));
    },
    enabled: !!user && !!otherUserId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`private-messages-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Only handle messages for this conversation
          if (
            newMsg.is_private &&
            ((newMsg.sender_id === user.id && newMsg.recipient_id === otherUserId) ||
              (newMsg.sender_id === otherUserId && newMsg.recipient_id === user.id))
          ) {
            // Fetch sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .maybeSingle();

            const messageWithProfile: PrivateMessageWithProfile = {
              ...newMsg,
              senderUsername: profile?.username || 'Anonyme',
              senderAvatar: profile?.avatar_url || null,
            };

            queryClient.setQueryData<PrivateMessageWithProfile[]>(
              ['private-messages', user.id, otherUserId],
              (old) => [...(old || []), messageWithProfile]
            );

            // Also invalidate conversations to update last message
            queryClient.invalidateQueries({ queryKey: ['private-conversations', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, queryClient]);

  // Send private message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ content, messageType }: { content: string; messageType: 'text' | 'image' | 'video' }) => {
      if (!user || !otherUserId) throw new Error('Not authenticated or no recipient');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: otherUserId,
          content,
          message_type: messageType,
          is_private: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    sendMessage,
  };
};
