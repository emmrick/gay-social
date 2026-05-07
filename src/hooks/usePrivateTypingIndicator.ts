import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';

export const usePrivateTypingIndicator = (otherUserId: string | null) => {
  const { user, profile } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Conserve une référence unique au channel pour éviter de créer
  // un channel jetable à chaque startTyping/stopTyping (fuite mémoire).
  const channelRef = useRef<RealtimeChannel | null>(null);

  const conversationKey = useCallback(() => {
    if (!user?.id || !otherUserId) return null;
    const ids = [user.id, otherUserId].sort();
    return `private-${ids[0]}-${ids[1]}`;
  }, [user?.id, otherUserId])();

  useEffect(() => {
    if (!conversationKey || !otherUserId || !user?.id) return;

    const channel = supabase
      .channel(`typing-broadcast-${conversationKey}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.user_id === otherUserId) {
          setIsOtherTyping(true);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
          otherTypingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload?.user_id === otherUserId) {
          setIsOtherTyping(false);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (isTypingRef.current && user?.id) {
        try {
          channel.send({
            type: 'broadcast',
            event: 'stop_typing',
            payload: { user_id: user.id },
          });
        } catch { /* best-effort */ }
        isTypingRef.current = false;
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationKey, otherUserId, user?.id]);

  const startTyping = useCallback(async (hasText: boolean = true) => {
    if (!conversationKey || !user?.id || !profile?.username) return;
    const channel = channelRef.current;
    if (!channel) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!hasText) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        await channel.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id },
        });
      }
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id, username: profile.username },
      });
    }

    typingTimeoutRef.current = setTimeout(() => { /* keepalive */ }, 3000);
  }, [conversationKey, user?.id, profile?.username]);

  const stopTyping = useCallback(async () => {
    if (!conversationKey || !user?.id) return;
    const channel = channelRef.current;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (isTypingRef.current && channel) {
      isTypingRef.current = false;
      await channel.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: user.id },
      });
    }
  }, [conversationKey, user?.id]);

  return {
    isOtherTyping,
    startTyping,
    stopTyping,
  };
};
