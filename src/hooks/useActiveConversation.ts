import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks which conversation the user is currently viewing.
 * Used to avoid sending notifications when the recipient is already in the conversation.
 */
export const useActiveConversation = (
  activePrivateUserId: string | null,
  activeChatRoomId: string | null
) => {
  const { user } = useAuth();
  const lastSentRef = useRef<string>('');

  useEffect(() => {
    if (!user?.id) return;

    const key = `${activePrivateUserId || ''}-${activeChatRoomId || ''}`;
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    // Upsert the active conversation state
    supabase
      .from('user_active_conversations' as any)
      .upsert(
        {
          user_id: user.id,
          active_private_user_id: activePrivateUserId,
          active_chat_room_id: activeChatRoomId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .then();

    // Clear on unmount
    return () => {
      supabase
        .from('user_active_conversations' as any)
        .upsert(
          {
            user_id: user.id,
            active_private_user_id: null,
            active_chat_room_id: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .then();
    };
  }, [user?.id, activePrivateUserId, activeChatRoomId]);
};

/**
 * Check if a user is currently viewing a specific private conversation.
 */
export const isUserViewingPrivateChat = async (
  recipientId: string,
  senderId: string
): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('user_active_conversations' as any)
      .select('active_private_user_id, updated_at')
      .eq('user_id', recipientId)
      .maybeSingle();

    if (!data) return false;

    // Check if updated_at is recent (within 2 minutes) to avoid stale data
    const updatedAt = new Date((data as any).updated_at);
    const now = new Date();
    if (now.getTime() - updatedAt.getTime() > 2 * 60 * 1000) return false;

    return (data as any).active_private_user_id === senderId;
  } catch {
    return false;
  }
};

/**
 * Check if a user is currently viewing a specific group chat room.
 */
export const isUserViewingChatRoom = async (
  recipientId: string,
  chatRoomId: string
): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('user_active_conversations' as any)
      .select('active_chat_room_id, updated_at')
      .eq('user_id', recipientId)
      .maybeSingle();

    if (!data) return false;

    const updatedAt = new Date((data as any).updated_at);
    const now = new Date();
    if (now.getTime() - updatedAt.getTime() > 2 * 60 * 1000) return false;

    return (data as any).active_chat_room_id === chatRoomId;
  } catch {
    return false;
  }
};
