import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AutoDeleteMode = 'never' | 'immediate' | '24h' | '7d' | '30d' | '90d';

export const AUTO_DELETE_OPTIONS: { value: AutoDeleteMode; label: string; description: string }[] = [
  { value: 'immediate', label: 'Immédiatement', description: 'Supprimé dès que le message est lu' },
  { value: '24h', label: '24 heures', description: 'Supprimé 24h après envoi' },
  { value: '7d', label: '7 jours', description: 'Supprimé 7 jours après envoi' },
  { value: '30d', label: '30 jours', description: 'Supprimé 30 jours après envoi' },
  { value: '90d', label: '90 jours', description: 'Supprimé 90 jours après envoi' },
  { value: 'never', label: 'Jamais', description: 'Conserver l\'historique indéfiniment' },
];

export const useConversationAutoDelete = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversation-auto-delete', conversationId, user?.id],
    queryFn: async () => {
      if (!user || !conversationId) return null;
      const { data, error } = await supabase
        .from('private_conversation_status')
        .select('auto_delete_mode, messages_hidden_before')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!conversationId,
  });

  const setAutoDeleteMode = useMutation({
    mutationFn: async ({ conversationId, mode }: { conversationId: string; mode: AutoDeleteMode }) => {
      if (!user) throw new Error('Not authenticated');

      // Calculate messages_hidden_before based on mode
      let messagesHiddenBefore: string | null = null;
      if (mode === 'immediate') {
        // For immediate, set to now - messages already read will be hidden
        messagesHiddenBefore = new Date().toISOString();
      } else if (mode !== 'never') {
        const intervals: Record<string, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000,
        };
        const ms = intervals[mode];
        if (ms) {
          messagesHiddenBefore = new Date(Date.now() - ms).toISOString();
        }
      }

      const { error } = await supabase
        .from('private_conversation_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          auto_delete_mode: mode,
          messages_hidden_before: messagesHiddenBefore,
          is_archived: false,
          is_deleted: false,
        }, {
          onConflict: 'conversation_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-auto-delete', conversationId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-messages'] });
      toast.success('Paramètre de suppression automatique mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  return {
    currentMode: (query.data?.auto_delete_mode as AutoDeleteMode) || 'never',
    messagesHiddenBefore: query.data?.messages_hidden_before || null,
    isLoading: query.isLoading,
    setAutoDeleteMode,
  };
};
