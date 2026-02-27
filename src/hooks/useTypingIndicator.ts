import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  user_id: string;
  username: string;
}

export const useTypingIndicator = (chatRoomId: string | null) => {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!chatRoomId) return;

    // Fetch initial typing users
    const fetchTypingUsers = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, username')
        .eq('chat_room_id', chatRoomId);
      
      if (data) {
        setTypingUsers(data.filter(t => t.user_id !== user?.id));
      }
    };

    fetchTypingUsers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`typing-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTyping = payload.new as TypingUser;
            if (newTyping.user_id !== user?.id) {
              setTypingUsers(prev => {
                const exists = prev.find(t => t.user_id === newTyping.user_id);
                if (exists) return prev;
                return [...prev, newTyping];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldTyping = payload.old as { user_id: string };
            setTypingUsers(prev => prev.filter(t => t.user_id !== oldTyping.user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, user?.id]);

  // Cleanup typing indicator on unmount or page unload
  useEffect(() => {
    const cleanup = () => {
      if (chatRoomId && user?.id) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('chat_room_id', chatRoomId)
          .eq('user_id', user.id)
          .then();
      }
    };

    // Also clean on beforeunload (tab close/refresh)
    const handleBeforeUnload = () => {
      if (isTypingRef.current) cleanup();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isTypingRef.current) cleanup();
    };
  }, [chatRoomId, user?.id]);

  const startTyping = useCallback(async (hasText: boolean = true) => {
    if (!chatRoomId || !user?.id || !profile?.username) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If no text, stop typing immediately
    if (!hasText) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('chat_room_id', chatRoomId)
          .eq('user_id', user.id);
      }
      return;
    }

    // Only insert if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await supabase
        .from('typing_indicators')
        .upsert({
          chat_room_id: chatRoomId,
          user_id: user.id,
          username: profile.username,
          started_at: new Date().toISOString(),
        }, { onConflict: 'chat_room_id,user_id' });
    }

    // Set timeout for keep-alive (indicator stays as long as there's text)
    typingTimeoutRef.current = setTimeout(() => {
      // Don't auto-remove - will be removed when text is cleared or message sent
    }, 3000);
  }, [chatRoomId, user?.id, profile?.username]);

  const stopTyping = useCallback(async () => {
    if (!chatRoomId || !user?.id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    isTypingRef.current = false;
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('chat_room_id', chatRoomId)
      .eq('user_id', user.id);
  }, [chatRoomId, user?.id]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
};
