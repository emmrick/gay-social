import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  user_id: string;
  username: string;
}

export const useSupportTypingIndicator = (ticketId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!ticketId || !user?.id) return;

    const channel = supabase.channel(`support-typing-${ticketId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === user.id) return;

        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.user_id === payload.user_id);
          if (!exists) {
            return [...prev, { user_id: payload.user_id, username: payload.username }];
          }
          return prev;
        });

        // Clear previous timeout for this user
        if (typingTimeoutsRef.current[payload.user_id]) {
          clearTimeout(typingTimeoutsRef.current[payload.user_id]);
        }

        // Remove after 4s of no typing events
        typingTimeoutsRef.current[payload.user_id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.user_id));
          delete typingTimeoutsRef.current[payload.user_id];
        }, 4000);
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        if (payload.user_id === user.id) return;
        setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.user_id));
        if (typingTimeoutsRef.current[payload.user_id]) {
          clearTimeout(typingTimeoutsRef.current[payload.user_id]);
          delete typingTimeoutsRef.current[payload.user_id];
        }
      })
      .subscribe();

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      setTypingUsers([]);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [ticketId, user?.id]);

  const sendTyping = useCallback(
    (username: string) => {
      if (!channelRef.current || !user?.id) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id, username },
      });
    },
    [user?.id]
  );

  const sendStopTyping = useCallback(() => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: user.id },
    });
    isTypingRef.current = false;
  }, [user?.id]);

  const handleTyping = useCallback(
    (hasText: boolean, username: string) => {
      if (hasText && !isTypingRef.current) {
        isTypingRef.current = true;
        sendTyping(username);
      } else if (hasText) {
        sendTyping(username);
      } else if (!hasText && isTypingRef.current) {
        sendStopTyping();
      }
    },
    [sendTyping, sendStopTyping]
  );

  return { typingUsers, handleTyping, sendStopTyping };
};
