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
  const conversationKey = useCallback(() => {
    if (!user?.id || !otherUserId) return null;
    // Sort IDs to ensure same key regardless of who's sender/receiver
    const ids = [user.id, otherUserId].sort();
    return `private-${ids[0]}-${ids[1]}`;
  }, [user?.id, otherUserId])();

  // Subscribe to typing indicators for this private conversation
  useEffect(() => {
    if (!conversationKey || !otherUserId || !user?.id) return;

    console.log('[Typing] Subscribing to channel:', conversationKey);

    // Subscribe to realtime changes with filter
    const channel = supabase
      .channel(`typing-${conversationKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `chat_room_id=eq.${conversationKey}`,
        },
        (payload) => {
          console.log('[Typing] Received event:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTyping = payload.new as { user_id: string; chat_room_id: string };
            // Check if this is from the other user
            if (newTyping.user_id === otherUserId) {
              console.log('[Typing] Other user is typing');
              setIsOtherTyping(true);
              
              // Clear existing timeout
              if (otherTypingTimeoutRef.current) {
                clearTimeout(otherTypingTimeoutRef.current);
              }
              
              // Auto-hide after 4 seconds if no update
              otherTypingTimeoutRef.current = setTimeout(() => {
                console.log('[Typing] Timeout - hiding indicator');
                setIsOtherTyping(false);
              }, 4000);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldTyping = payload.old as { user_id: string };
            if (oldTyping.user_id === otherUserId) {
              console.log('[Typing] Other user stopped typing');
              setIsOtherTyping(false);
              if (otherTypingTimeoutRef.current) {
                clearTimeout(otherTypingTimeoutRef.current);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Typing] Subscription status:', status);
      });

    return () => {
      console.log('[Typing] Unsubscribing from channel');
      supabase.removeChannel(channel);
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
      }
    };
  }, [conversationKey, otherUserId, user?.id]);

  // Cleanup typing indicator on unmount
  useEffect(() => {
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
  }, [conversationKey, user?.id]);

  const startTyping = useCallback(async () => {
    if (!conversationKey || !user?.id || !profile?.username) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only insert if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      console.log('[Typing] Starting to type, inserting indicator');
      
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          chat_room_id: conversationKey,
          user_id: user.id,
          username: profile.username,
          started_at: new Date().toISOString(),
        }, { onConflict: 'chat_room_id,user_id' });
      
      if (error) {
        console.error('[Typing] Error inserting indicator:', error);
      }
    }

    // Set timeout to remove typing indicator after 3 seconds of no activity
    typingTimeoutRef.current = setTimeout(async () => {
      console.log('[Typing] Timeout - removing indicator');
      isTypingRef.current = false;
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('chat_room_id', conversationKey)
        .eq('user_id', user.id);
    }, 3000);
  }, [conversationKey, user?.id, profile?.username]);

  const stopTyping = useCallback(async () => {
    if (!conversationKey || !user?.id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    isTypingRef.current = false;
    console.log('[Typing] Manually stopping typing');
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('chat_room_id', conversationKey)
      .eq('user_id', user.id);
  }, [conversationKey, user?.id]);

  return {
    isOtherTyping,
    startTyping,
    stopTyping,
  };
};
