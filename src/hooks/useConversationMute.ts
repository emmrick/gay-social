import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to manage per-conversation mute preferences.
 * conversationId can be a private chat partner ID, a group room ID, or 'announcement'.
 */
export const useConversationMute = (conversationId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isMuted = false, isLoading } = useQuery({
    queryKey: ['conversation-mute', user?.id, conversationId],
    queryFn: async () => {
      if (!user?.id || !conversationId) return false;
      const { data } = await supabase
        .from('conversation_mute_preferences' as any)
        .select('is_muted')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      return (data as any)?.is_muted ?? false;
    },
    enabled: !!user?.id && !!conversationId,
    staleTime: 60000,
  });

  const toggleMute = useMutation({
    mutationFn: async () => {
      if (!user?.id || !conversationId) throw new Error('Missing data');
      
      if (isMuted) {
        // Unmute: delete the record
        await supabase
          .from('conversation_mute_preferences' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId);
      } else {
        // Mute: upsert
        await supabase
          .from('conversation_mute_preferences' as any)
          .upsert({
            user_id: user.id,
            conversation_id: conversationId,
            is_muted: true,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'user_id,conversation_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-mute', user?.id, conversationId] });
    },
  });

  return { isMuted, isLoading, toggleMute };
};
