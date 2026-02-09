import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useUserUsage } from './useUserUsage';
import { toast } from 'sonner';

type PrivateConversation = Tables<'private_conversations'>;

interface ConversationWithProfile extends PrivateConversation {
  otherUser: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean | null;
    last_seen: string | null;
    hide_online_status: boolean | null;
    hide_last_seen: boolean | null;
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
  const { 
    canStartConversation, 
    incrementConversations, 
    conversationsCount, 
    limits
  } = useUserUsage();

  // Fetch conversation statuses
  const statusQuery = useQuery({
    queryKey: ['private-conversation-status', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('private_conversation_status')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

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

      // Fetch profiles for other users with all status fields
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_online, last_seen, hide_online_status, hide_last_seen')
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
              hide_online_status: false,
              hide_last_seen: false,
            },
            lastMessage: lastMsg || undefined,
          };
        })
      );

      // Sort by last message date (most recent first), fallback to conversation created_at
      return conversationsWithData.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at;
        const bTime = b.lastMessage?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    },
    enabled: !!user,
  });

  // Filter conversations based on status
  const allConversations = query.data || [];
  const statuses = statusQuery.data || [];
  
  const statusMap = new Map(statuses.map(s => [s.conversation_id, s]));
  
  // Helper to sort by last activity (last message or creation date)
  const sortByLastActivity = (convs: ConversationWithProfile[]) => {
    return [...convs].sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  };
  
  // Active conversations: not archived and not deleted
  const activeConversations = sortByLastActivity(
    allConversations.filter(conv => {
      const status = statusMap.get(conv.id);
      if (!status) return true; // No status = active
      return !status.is_archived && !status.is_deleted;
    })
  );
  
  // Archived conversations: archived but not deleted
  const archivedConversations = sortByLastActivity(
    allConversations.filter(conv => {
      const status = statusMap.get(conv.id);
      if (!status) return false;
      return status.is_archived && !status.is_deleted;
    })
  );

  // Real-time subscription for new conversations and new messages
  // Profile changes (avatar, username, online status) are handled by useRealtimeProfileSync
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
      // Listen for messages sent BY the user
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as { is_private: boolean };
          if (msg.is_private) {
            queryClient.invalidateQueries({ queryKey: ['private-conversations', user.id] });
          }
        }
      )
      // Listen for messages received BY the user
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as { is_private: boolean };
          if (msg.is_private) {
            queryClient.invalidateQueries({ queryKey: ['private-conversations', user.id] });
          }
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

      if (existing) {
        // Reset status (in case it was deleted/archived) so it reappears in active list
        await supabase
          .from('private_conversation_status')
          .upsert({
            conversation_id: existing.id,
            user_id: user.id,
            is_archived: false,
            is_deleted: false,
          }, {
            onConflict: 'conversation_id,user_id',
          });
        return existing;
      }

      // Check limit before creating new conversation
      if (!canStartConversation()) {
        throw new Error('LIMIT_REACHED');
      }

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

      // Increment usage counter for new conversation
      await incrementConversations();

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status', user?.id] });
    },
    onError: (error: Error) => {
      if (error.message === 'LIMIT_REACHED') {
        toast.error(
          `Limite atteinte ! Vous avez démarré ${conversationsCount}/${limits.conversationsPerWeek} conversations cette semaine. Achetez des crédits pour débloquer plus de conversations.`,
          {
            action: {
              label: 'Acheter des crédits',
              onClick: () => window.location.href = '/?tab=credits',
            },
          }
        );
      }
    },
  });

  return {
    conversations: activeConversations,
    archivedConversations,
    isLoading: query.isLoading || statusQuery.isLoading,
    error: query.error,
    getOrCreateConversation,
    canStartNewConversation: canStartConversation(),
    remainingConversations: Math.max(0, limits.conversationsPerWeek - conversationsCount),
  };
};
