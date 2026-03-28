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
 * Uses a SECURITY DEFINER RPC to avoid exposing other users' active conversation state.
 */
export const isUserViewingPrivateChat = async (
  recipientId: string,
  senderId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_user_viewing_conversation', {
      _target_user_id: recipientId,
      _private_user_id: senderId,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
};

/**
 * Check if a user is currently viewing a specific group chat room.
 * Uses a SECURITY DEFINER RPC to avoid exposing other users' active conversation state.
 */
export const isUserViewingChatRoom = async (
  recipientId: string,
  chatRoomId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_user_viewing_conversation', {
      _target_user_id: recipientId,
      _chat_room_id: chatRoomId,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
};
