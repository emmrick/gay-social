import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePrivateTypingIndicator = (otherUserId: string | null) => {
  const { user, profile } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a consistent conversation key
  const getConversationKey = useCallback(() => {
    if (!user?.id || !otherUserId) return null;
    // Sort IDs to ensure same key regardless of who's sender/receiver
    const ids = [user.id, otherUserId].sort();
    return `private-${ids[0]}-${ids[1]}`;
  }, [user?.id, otherUserId]);

  // Subscribe to typing indicators for this private conversation
  useEffect(() => {
    const conversationKey = getConversationKey();
    if (!conversationKey || !otherUserId) return;

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`private-typing-${conversationKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTyping = payload.new as { user_id: string; chat_room_id: string };
            // Check if this is from the other user in our conversation
            if (newTyping.user_id === otherUserId && newTyping.chat_room_id === conversationKey) {
              setIsOtherTyping(true);
              
              // Clear existing timeout
              if (otherTypingTimeoutRef.current) {
                clearTimeout(otherTypingTimeoutRef.current);
              }
              
              // Auto-hide after 4 seconds if no update
              otherTypingTimeoutRef.current = setTimeout(() => {
                setIsOtherTyping(false);
              }, 4000);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldTyping = payload.old as { user_id: string; chat_room_id: string };
            if (oldTyping.user_id === otherUserId && oldTyping.chat_room_id === conversationKey) {
              setIsOtherTyping(false);
              if (otherTypingTimeoutRef.current) {
                clearTimeout(otherTypingTimeoutRef.current);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
      }
    };
  }, [getConversationKey, otherUserId]);

  // Cleanup typing indicator on unmount
  useEffect(() => {
    const conversationKey = getConversationKey();
    return () => {
      if (conversationKey && user?.id && isTypingRef.current) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('chat_room_id', conversationKey)
          .eq('user_id', user.id)
          .then();
      }
    };
  }, [getConversationKey, user?.id]);

  const startTyping = useCallback(async () => {
    const conversationKey = getConversationKey();
    if (!conversationKey || !user?.id || !profile?.username) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only insert if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await supabase
        .from('typing_indicators')
        .upsert({
          chat_room_id: conversationKey,
          user_id: user.id,
          username: profile.username,
          started_at: new Date().toISOString(),
        }, { onConflict: 'chat_room_id,user_id' });
    }

    // Set timeout to remove typing indicator after 3 seconds of no activity
    typingTimeoutRef.current = setTimeout(async () => {
      isTypingRef.current = false;
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('chat_room_id', conversationKey)
        .eq('user_id', user.id);
    }, 3000);
  }, [getConversationKey, user?.id, profile?.username]);

  const stopTyping = useCallback(async () => {
    const conversationKey = getConversationKey();
    if (!conversationKey || !user?.id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    isTypingRef.current = false;
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('chat_room_id', conversationKey)
      .eq('user_id', user.id);
  }, [getConversationKey, user?.id]);

  return {
    isOtherTyping,
    startTyping,
    stopTyping,
  };
};
