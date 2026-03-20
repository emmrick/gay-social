import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSoundStandalone, playAnnouncementSoundStandalone } from '@/hooks/useNotificationSound';
import { notifyNewGroupMessage } from '@/services/pushNotificationService';
import { isUserViewingChatRoom } from '@/hooks/useActiveConversation';
import { CREDIT_COSTS, deductCredits, checkSufficientCredits, getDynamicCreditCost } from '@/hooks/useCredits';

type Message = Tables<'messages'>;

interface MessageWithProfile extends Message {
  senderUsername?: string;
  senderAvatar?: string | null;
  replyToMessage?: {
    id: string;
    content: string;
    senderUsername: string;
  } | null;
}

export const useMessages = (chatRoomId: string | null, searchQuery?: string, isAnnouncementChannel?: boolean) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch messages
  const query = useQuery({
    queryKey: ['messages', chatRoomId],
    queryFn: async (): Promise<MessageWithProfile[]> => {
      if (!chatRoomId) return [];

      // First get messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .eq('is_private', false)
        .is('deleted_at', null) // Exclude soft-deleted messages
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      if (!messages) return [];

      // Get unique sender IDs
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      
      // Fetch profiles for all senders
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', senderIds);

      // Map profiles to messages
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Create message map for replies
      const messageMap = new Map(messages.map(m => [m.id, m]));
      
      return messages.map(msg => {
        const replyTo = msg.reply_to_id ? messageMap.get(msg.reply_to_id) : null;
        return {
          ...msg,
          senderUsername: profileMap.get(msg.sender_id)?.username || 'Anonyme',
          senderAvatar: profileMap.get(msg.sender_id)?.avatar_url,
          replyToMessage: replyTo ? {
            id: replyTo.id,
            content: replyTo.content || '',
            senderUsername: profileMap.get(replyTo.sender_id)?.username || 'Anonyme',
          } : null,
        };
      });
    },
    enabled: !!chatRoomId,
  });

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery || !query.data) return query.data || [];
    const lowerQuery = searchQuery.toLowerCase();
    return query.data.filter(msg => 
      msg.content?.toLowerCase().includes(lowerQuery) ||
      msg.senderUsername?.toLowerCase().includes(lowerQuery)
    );
  }, [query.data, searchQuery]);

  // Get search result indices
  const searchResults = useMemo(() => {
    if (!searchQuery || !query.data) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return query.data
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => 
        msg.content?.toLowerCase().includes(lowerQuery)
      )
      .map(({ msg }) => msg.id);
  }, [query.data, searchQuery]);

  // Real-time subscription
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`messages-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Check if message already exists to prevent duplicates
          const existingMessages = queryClient.getQueryData<MessageWithProfile[]>(['messages', chatRoomId]);
          if (existingMessages?.some(m => m.id === newMsg.id)) {
            return;
          }

          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', newMsg.sender_id)
            .maybeSingle();

          const newMessage: MessageWithProfile = {
            ...newMsg,
            senderUsername: profile?.username || 'Anonyme',
            senderAvatar: profile?.avatar_url,
          };

          queryClient.setQueryData<MessageWithProfile[]>(
            ['messages', chatRoomId],
            (old) => {
              // Double-check for duplicates before adding
              if (old?.some(m => m.id === newMessage.id)) return old;
              return [...(old || []), newMessage];
            }
          );

          // Don't play sound - user is already viewing this chat room
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, queryClient]);

  // Ref to prevent double submissions
  const sendingRef = useRef(false);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ content, messageType, replyToId }: { content: string; messageType: 'text' | 'image' | 'video'; replyToId?: string }) => {
      if (!user || !chatRoomId) throw new Error('Not authenticated or no room');
      
      // Prevent double submission
      if (sendingRef.current) {
        throw new Error('Message already being sent');
      }
      sendingRef.current = true;

      try {
        // Calculate credit cost based on message type - use dynamic costs from DB
        const costKey = messageType === 'text' ? 'group_message_text' : 'group_message_media';
        const creditCost = await getDynamicCreditCost(costKey);

        // Check if user has enough credits
        const hasCredits = await checkSufficientCredits(user.id, creditCost);
        if (!hasCredits) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        // Deduct credits first
        const deductResult = await deductCredits(
          user.id, 
          creditCost, 
          messageType === 'text' ? 'group_message_text' : 'group_message_media',
          `Message groupe ${messageType === 'text' ? 'texte' : messageType === 'image' ? 'photo' : 'vidéo'}`
        );

        if (!deductResult.success) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        const { data, error } = await supabase
          .from('messages')
          .insert({
            chat_room_id: chatRoomId,
            sender_id: user.id,
            content,
            message_type: messageType,
            is_private: false,
            reply_to_id: replyToId || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Fire-and-forget: send notifications in background without blocking
        (async () => {
          try {
            // Get chat room info and sender profile in parallel
            const [roomResult, senderResult] = await Promise.all([
              supabase
                .from('chat_rooms')
                .select('region_name, region_code, is_custom, id')
                .eq('id', chatRoomId)
                .single(),
              supabase
                .from('profiles')
                .select('username')
                .eq('user_id', user.id)
                .single(),
            ]);

            const roomName = roomResult.data?.region_name || 'Groupe';
            const senderName = senderResult.data?.username || 'Quelqu\'un';
            const regionCode = roomResult.data?.region_code;

            // Get all members of this group to notify them
            const { data: roomMembers } = await supabase
              .from('chat_room_members')
              .select('user_id')
              .eq('chat_room_id', chatRoomId);

            const memberIds = (roomMembers || [])
              .map(m => m.user_id)
              .filter(id => id !== user.id);

            const messagePreview = messageType === 'text'
              ? (content || '').substring(0, 50)
              : messageType === 'image' ? '📷 Photo' : '🎥 Vidéo';

            // Filter out members who are currently viewing this chat room
            const membersToNotify = await Promise.all(
              memberIds.map(async (memberId) => {
                const isViewing = await isUserViewingChatRoom(memberId, chatRoomId);
                return isViewing ? null : memberId;
              })
            );
            const filteredMembers = membersToNotify.filter(Boolean) as string[];

            // Send push notifications only to members NOT viewing (fire-and-forget)
            Promise.allSettled(
              filteredMembers.map(memberId =>
                notifyNewGroupMessage(memberId, roomName, senderName, messagePreview, regionCode)
              )
            );

            // Detect mentions for additional in-app notifications
            if (content && messageType === 'text') {
              const mentionRegex = /@(\w+)/g;
              const mentions = content.match(mentionRegex);
              
              if (mentions && mentions.length > 0) {
                const usernames = mentions.map(m => m.substring(1).toLowerCase());

                const { data: mentionedProfiles } = await supabase
                  .from('profiles')
                  .select('user_id, username')
                  .in('username', usernames.map(u => u.toLowerCase()));

                if (mentionedProfiles && mentionedProfiles.length > 0) {
                  for (const mentionedUser of mentionedProfiles) {
                    if (mentionedUser.user_id === user.id) continue;

                    await supabase.from('notifications').insert({
                      user_id: mentionedUser.user_id,
                      type: 'group_mention',
                      title: `💬 Mention dans ${roomName}`,
                      message: `${senderName} t'a mentionné: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                      action_url: '/',
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error sending group notifications:', e);
          }
        })();

        return data;
      } finally {
        sendingRef.current = false;
      }
    },
  });

  return {
    messages: query.data || [],
    filteredMessages,
    searchResults,
    isLoading: query.isLoading,
    error: query.error,
    sendMessage,
  };
};
