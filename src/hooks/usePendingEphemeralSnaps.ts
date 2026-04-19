import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingSnap {
  messageId: string;
  mediaType: 'image' | 'video';
  senderId: string;
}

/**
 * Returns a map of otherUserId -> PendingSnap for unopened ephemeral media
 * received (not sent by current user) in private conversations.
 */
export const usePendingEphemeralSnaps = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-ephemeral-snaps', user?.id],
    queryFn: async (): Promise<Map<string, PendingSnap>> => {
      if (!user) return new Map();

      // Get all unviewed ephemeral media where the message is a private message sent TO me
      // Only consider snaps received in the last 7 days — older ones are auto-purged
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('ephemeral_media')
        .select('message_id, media_type, id')
        .eq('is_viewed', false)
        .neq('view_duration', 0) // Exclude unlimited
        .gte('created_at', sevenDaysAgo);

      if (error) throw error;
      if (!data || data.length === 0) return new Map();

      // Get the corresponding messages to find sender
      const messageIds = data.map(d => d.message_id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id')
        .in('id', messageIds)
        .eq('is_private', true)
        .eq('recipient_id', user.id);

      if (!messages || messages.length === 0) return new Map();

      const mediaMap = new Map(data.map(d => [d.message_id, d]));
      const result = new Map<string, PendingSnap>();

      for (const msg of messages) {
        const media = mediaMap.get(msg.id);
        if (media) {
          result.set(msg.sender_id, {
            messageId: msg.id,
            mediaType: media.media_type as 'image' | 'video',
            senderId: msg.sender_id,
          });
        }
      }

      return result;
    },
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
};
