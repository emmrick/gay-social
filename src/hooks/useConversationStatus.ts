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

      // First check if a status already exists
      const { data: existing } = await supabase
        .from('private_conversation_status')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('private_conversation_status')
          .update({
            is_archived: true,
            is_deleted: false,
            updated_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('private_conversation_status')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            is_archived: true,
            is_deleted: false,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status'] });
      toast.success('Conversation archivée');
    },
    onError: (error) => {
      console.error('Archive error:', error);
      toast.error('Erreur lors de l\'archivage');
    },
  });

  const unarchiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('private_conversation_status')
        .update({
          is_archived: false,
          is_deleted: false,
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status'] });
      toast.success('Conversation restaurée');
    },
    onError: (error) => {
      console.error('Unarchive error:', error);
      toast.error('Erreur lors de la restauration');
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      // First check if a status already exists
      const { data: existing } = await supabase
        .from('private_conversation_status')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('private_conversation_status')
          .update({
            is_deleted: true,
            is_archived: false,
            updated_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('private_conversation_status')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            is_deleted: true,
            is_archived: false,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status'] });
      toast.success('Conversation supprimée');
    },
    onError: (error) => {
      console.error('Delete error:', error);
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
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['private-conversation-status'] });
      toast.success('Conversation restaurée');
    },
    onError: (error) => {
      console.error('Restore error:', error);
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
