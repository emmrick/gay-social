import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useConversationStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('private_conversation_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_archived: true,
          is_deleted: false,
        }, {
          onConflict: 'conversation_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status', user?.id] });
      toast.success('Conversation archivée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'archivage');
    },
  });

  const unarchiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('private_conversation_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_archived: false,
          is_deleted: false,
        }, {
          onConflict: 'conversation_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status', user?.id] });
      toast.success('Conversation restaurée');
    },
    onError: () => {
      toast.error('Erreur lors de la restauration');
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('private_conversation_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_deleted: true,
          is_archived: false,
        }, {
          onConflict: 'conversation_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status', user?.id] });
      toast.success('Conversation supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const restoreConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('private_conversation_status')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status', user?.id] });
      toast.success('Conversation restaurée');
    },
    onError: () => {
      toast.error('Erreur lors de la restauration');
    },
  });

  return {
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    restoreConversation,
  };
};
