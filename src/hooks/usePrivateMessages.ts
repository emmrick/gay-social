import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRecordEarning } from '@/hooks/useModeratorEarnings';
import { withTimeout } from '@/lib/withTimeout';

type Message = Tables<'messages'>;

interface PrivateMessageWithProfile extends Message {
  senderUsername: string;
  senderAvatar: string | null;
  read_at: string | null;
}

export const usePrivateMessages = (otherUserId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const recordEarning = useRecordEarning();

  const query = useQuery({
    queryKey: ['private-messages', user?.id, otherUserId],
    queryFn: async (): Promise<PrivateMessageWithProfile[]> => {
      if (!user || !otherUserId) return [];

      // Fetch messages with timeout to prevent infinite loading
      const { data: messages, error } = await withTimeout(
        Promise.resolve(
          supabase
            .from('messages')
            .select('*')
            .eq('is_private', true)
            .is('deleted_at', null)
            .or(
              `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
            )
            .order('created_at', { ascending: true })
            .limit(50)
        ),
        12000
      );

      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Get profiles for both users in single request
      const { data: profiles } = await withTimeout(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', [user.id, otherUserId])
        ),
        12000
      );

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return messages.map(msg => ({
        ...msg,
        senderUsername: profileMap.get(msg.sender_id)?.username || 'Anonyme',
        senderAvatar: profileMap.get(msg.sender_id)?.avatar_url || null,
        read_at: (msg as unknown as { read_at: string | null }).read_at ?? null,
      }));
    },
    enabled: !!user && !!otherUserId,
    staleTime: 10000, // Cache for 10 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    // IMPORTANT: avoid long "stuck loading" states when the backend is slow/unavailable.
    // Users have a manual "Réessayer" button in the UI.
    retry: 0,
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
              read_at: (newMsg as unknown as { read_at: string | null }).read_at ?? null,
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

      // Get sender's profile for the notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

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

      // Send notification to the recipient
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'message',
        title: '💬 Nouveau message',
        message: `${senderProfile?.username || 'Quelqu\'un'} t'a envoyé un message`,
        action_url: `/profile/${user.id}`,
      });

      return data;
    },
    onSuccess: () => {
      // Record earning for admin/moderator when sending private message
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
    refetch: query.refetch,
    sendMessage,
  };
};
