import { useEffect, useRef } from 'react';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRecordEarning } from '@/hooks/useModeratorEarnings';
import { notifyNewPrivateMessage, notifyPrivateMessageInApp } from '@/services/pushNotificationService';
import { playNotificationSoundStandalone } from '@/hooks/useNotificationSound';
import { isUserViewingPrivateChat } from '@/hooks/useActiveConversation';
import { CREDIT_COSTS, deductCredits, checkSufficientCredits, getDynamicCreditCost } from '@/hooks/useCredits';
import { notifyInsufficientCreditsSync } from '@/lib/credits/insufficientCreditsToast';

type Message = Tables<'messages'>;

interface PrivateMessageWithProfile extends Message {
  senderUsername: string;
  senderAvatar: string | null;
}

export const usePrivateMessages = (otherUserId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const recordEarning = useRecordEarning();

  const query = useQuery({
    queryKey: ['private-messages', user?.id, otherUserId],
    queryFn: async (): Promise<PrivateMessageWithProfile[]> => {
      if (!user || !otherUserId) return [];

      // Run conversation lookup and profiles fetch in parallel
      const [convResult, profilesResult] = await Promise.all([
        supabase
          .from('private_conversations')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', [user.id, otherUserId]),
      ]);

      // Check auto-delete only if conversation exists
      let messagesHiddenBefore: string | null = null;
      if (convResult.data) {
        const { data: specificStatus } = await supabase
          .from('private_conversation_status')
          .select('messages_hidden_before')
          .eq('user_id', user.id)
          .eq('conversation_id', convResult.data.id)
          .maybeSingle();
        messagesHiddenBefore = specificStatus?.messages_hidden_before || null;
      }

      // Get messages between the two users
      let messagesQuery = supabase
        .from('messages')
        .select('*')
        .eq('is_private', true)
        .is('deleted_at', null)
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        );

      if (messagesHiddenBefore) {
        messagesQuery = messagesQuery.gt('created_at', messagesHiddenBefore);
      }

      const { data: messages, error } = await messagesQuery
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!messages) return [];

      const profileMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);

      // Sign avatar URLs for private bucket
      const signedAvatarMap = new Map<string, string | null>();
      await Promise.all(
        Array.from(profileMap.entries()).map(async ([userId, profile]) => {
          const signed = await getSignedAvatarUrl(profile.avatar_url);
          signedAvatarMap.set(userId, signed);
        })
      );

      // We fetched DESC for correct pagination, now re-sort for display (old -> new)
      const ordered = [...messages].reverse();

      return ordered.map(msg => ({
        ...msg,
        senderUsername: profileMap.get(msg.sender_id)?.username || 'Anonyme',
        senderAvatar: signedAvatarMap.get(msg.sender_id) ?? null,
      }));
    },
    enabled: !!user && !!otherUserId,
    staleTime: 60_000,
  });

  // Real-time subscription for new messages AND updates (for read status)
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
          
          if (
            newMsg.is_private &&
            ((newMsg.sender_id === user.id && newMsg.recipient_id === otherUserId) ||
              (newMsg.sender_id === otherUserId && newMsg.recipient_id === user.id))
          ) {
            const existingMessages = queryClient.getQueryData<PrivateMessageWithProfile[]>(
              ['private-messages', user.id, otherUserId]
            );
            if (existingMessages?.some(m => m.id === newMsg.id)) return;

            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .maybeSingle();

            const signedAvatar = await getSignedAvatarUrl(profile?.avatar_url);
            const messageWithProfile: PrivateMessageWithProfile = {
              ...newMsg,
              senderUsername: profile?.username || 'Anonyme',
              senderAvatar: signedAvatar || null,
            };

            queryClient.setQueryData<PrivateMessageWithProfile[]>(
              ['private-messages', user.id, otherUserId],
              (old) => {
                if (old?.some(m => m.id === newMsg.id)) return old;
                return [...(old || []), messageWithProfile];
              }
            );

            // Don't play sound - user is already viewing this conversation

            queryClient.invalidateQueries({ queryKey: ['private-conversations', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          
          if (
            updatedMsg.is_private &&
            ((updatedMsg.sender_id === user.id && updatedMsg.recipient_id === otherUserId) ||
              (updatedMsg.sender_id === otherUserId && updatedMsg.recipient_id === user.id))
          ) {
            queryClient.setQueryData<PrivateMessageWithProfile[]>(
              ['private-messages', user.id, otherUserId],
              (old) => {
                if (!old) return old;
                return old.map(msg => 
                  msg.id === updatedMsg.id 
                    ? { ...msg, read_at: updatedMsg.read_at }
                    : msg
                );
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, queryClient]);

  const sendingRef = useRef(false);

  const sendMessage = useMutation({
    mutationFn: async ({ content, messageType }: { content: string; messageType: 'text' | 'image' | 'video' }) => {
      if (!user || !otherUserId) throw new Error('Not authenticated or no recipient');
      
      if (sendingRef.current) throw new Error('Message already being sent');
      sendingRef.current = true;

      try {
        const costKey = messageType === 'text' ? 'private_message_text' : 'private_message_media';
        const creditCost = await getDynamicCreditCost(costKey);

        const hasCredits = await checkSufficientCredits(user.id, creditCost);
        if (!hasCredits) {
          notifyInsufficientCreditsSync('Message privé');
          throw new Error('INSUFFICIENT_CREDITS');
        }

        const deductResult = await deductCredits(
          user.id, 
          creditCost, 
          messageType === 'text' ? 'private_message_text' : 'private_message_media',
          `Message privé ${messageType === 'text' ? 'texte' : messageType === 'image' ? 'photo' : 'vidéo'}`
        );

        if (!deductResult.success) throw new Error('INSUFFICIENT_CREDITS');

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
      } finally {
        sendingRef.current = false;
      }
    },
    onSuccess: (newMessage) => {
      if (newMessage) {
        const messageWithProfile: PrivateMessageWithProfile = {
          ...newMessage,
          senderUsername: 'Moi',
          senderAvatar: null,
        };
        
        queryClient.setQueryData<PrivateMessageWithProfile[]>(
          ['private-messages', user?.id, otherUserId],
          (old) => {
            if (old?.some(m => m.id === newMessage.id)) return old;
            return [...(old || []), messageWithProfile];
          }
        );

        queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });

        // Fire-and-forget: send notifications in background without blocking
        if (otherUserId && user) {
          (async () => {
            try {
              // Check if recipient is already viewing this conversation
              const isViewing = await isUserViewingPrivateChat(otherUserId, user.id);
              if (isViewing) {
                // Recipient is already in the conversation, skip notifications
                return;
              }

              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', user.id)
                .maybeSingle();
              
              const messagePreview = newMessage.message_type === 'text' 
                ? newMessage.content 
                : newMessage.message_type === 'image' 
                  ? '📷 Photo' 
                  : '🎥 Vidéo';
              
              // Send push + in-app in parallel
              Promise.allSettled([
                notifyNewPrivateMessage(
                  otherUserId,
                  senderProfile?.username || 'Quelqu\'un',
                  user.id,
                  messagePreview || undefined
                ),
                notifyPrivateMessageInApp(
                  otherUserId,
                  senderProfile?.username || 'Quelqu\'un',
                  user.id,
                  messagePreview || undefined
                ),
              ]);
            } catch (e) {
              console.error('Error sending private notifications:', e);
            }
          })();
        }
      }
      
      if (otherUserId) {
        recordEarning.mutate({
          taskType: 'private_message_response',
          targetUserId: otherUserId,
          description: 'Réponse message privé',
        });
      }
    },
  });

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    sendMessage,
  };
};
