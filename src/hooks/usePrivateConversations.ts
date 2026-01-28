import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type PrivateConversation = Tables<'private_conversations'>;

interface ConversationWithProfile extends PrivateConversation {
  otherUser: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean;
    last_seen: string | null;
  };
  lastMessage?: {
    content: string | null;
    created_at: string;
    message_type: string;
  };
}

export const usePrivateConversations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['private-conversations', user?.id],
    queryFn: async (): Promise<ConversationWithProfile[]> => {
      if (!user) return [];

      // Get all conversations for the current user
      const { data: conversations, error } = await supabase
        .from('private_conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!conversations) return [];

      // Get other user IDs
      const otherUserIds = conversations.map(conv => 
        conv.user1_id === user.id ? conv.user2_id : conv.user1_id
      );

      // Fetch profiles for other users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_online, last_seen')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch last message for each conversation
      const conversationsWithData = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, message_type')
            .eq('is_private', true)
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            otherUser: profileMap.get(otherUserId) || {
              user_id: otherUserId,
              username: 'Utilisateur',
              avatar_url: null,
              is_online: false,
              last_seen: null,
            },
            lastMessage: lastMsg || undefined,
          };
        })
      );

      return conversationsWithData;
    },
    enabled: !!user,
  });

  // Real-time subscription for new conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`private-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['private-conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Create or get existing conversation
  const getOrCreateConversation = useMutation({
    mutationFn: async (otherUserId: string): Promise<PrivateConversation> => {
      if (!user) throw new Error('Not authenticated');

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('private_conversations')
        .select('*')
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) return existing;

      // Create new conversation
      const { data, error } = await supabase
        .from('private_conversations')
        .insert({
          user1_id: user.id,
          user2_id: otherUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
    },
  });

  return {
    conversations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    getOrCreateConversation,
  };
};
