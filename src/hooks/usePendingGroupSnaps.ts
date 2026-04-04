import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingGroupSnap {
  messageId: string;
  mediaType: 'image' | 'video';
  senderId: string;
  chatRoomId: string;
}

/**
 * Returns a map of chatRoomId -> PendingGroupSnap for unopened ephemeral media
 * in group conversations (regional + custom).
 */
export const usePendingGroupSnaps = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-group-snaps', user?.id],
    queryFn: async (): Promise<Map<string, PendingGroupSnap>> => {
      if (!user) return new Map();

      // Get all unviewed ephemeral media (non-unlimited)
      const { data, error } = await supabase
        .from('ephemeral_media')
        .select('message_id, media_type, id')
        .eq('is_viewed', false)
        .neq('view_duration', 0);

      if (error) throw error;
      if (!data || data.length === 0) return new Map();

      // Get the corresponding GROUP messages (chat_room_id is not null, not sent by me)
      const messageIds = data.map(d => d.message_id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, sender_id, chat_room_id')
        .in('id', messageIds)
        .not('chat_room_id', 'is', null)
        .neq('sender_id', user.id);

      if (!messages || messages.length === 0) return new Map();

      const mediaMap = new Map(data.map(d => [d.message_id, d]));
      const result = new Map<string, PendingGroupSnap>();

      for (const msg of messages) {
        const media = mediaMap.get(msg.id);
        if (media && msg.chat_room_id) {
          // Keep the latest snap per room (don't overwrite if already set)
          if (!result.has(msg.chat_room_id)) {
            result.set(msg.chat_room_id, {
              messageId: msg.id,
              mediaType: media.media_type as 'image' | 'video',
              senderId: msg.sender_id,
              chatRoomId: msg.chat_room_id,
            });
          }
        }
      }

      return result;
    },
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
};
