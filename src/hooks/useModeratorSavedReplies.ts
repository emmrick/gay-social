import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedReply {
  id: string;
  user_id: string;
  content: string;
  label: string | null;
  display_order: number;
  created_at: string;
}

export const useModeratorSavedReplies = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['moderator-saved-replies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('moderator_saved_replies' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SavedReply[];
    },
    enabled: !!user?.id,
  });

  const addReply = useMutation({
    mutationFn: async ({ content, label }: { content: string; label?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('moderator_saved_replies' as any)
        .insert({
          user_id: user.id,
          content,
          label: label || null,
          display_order: replies.length,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-saved-replies'] });
      toast.success('Réponse enregistrée');
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('moderator_saved_replies' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-saved-replies'] });
      toast.success('Réponse supprimée');
    },
  });

  const updateReply = useMutation({
    mutationFn: async ({ id, content, label }: { id: string; content: string; label?: string }) => {
      const { error } = await supabase
        .from('moderator_saved_replies' as any)
        .update({ content, label: label || null, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-saved-replies'] });
      toast.success('Réponse mise à jour');
    },
  });

  return { replies, isLoading, addReply, deleteReply, updateReply };
};
