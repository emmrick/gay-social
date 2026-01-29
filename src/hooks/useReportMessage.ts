import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportReason } from './useReports';

interface ReportMessageData {
  messageId: string;
  senderId: string;
  reason: ReportReason;
  description?: string;
}

export const useReportMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ messageId, senderId, reason, description }: ReportMessageData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: senderId,
          message_id: messageId,
          report_type: 'message',
          reason,
          description: description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Signalement envoyé', {
        description: 'Merci pour votre signalement. Notre équipe va l\'examiner.',
      });
    },
    onError: (error) => {
      console.error('Error reporting message:', error);
      toast.error('Erreur', {
        description: 'Impossible d\'envoyer le signalement. Veuillez réessayer.',
      });
    },
  });

  return {
    reportMessage: mutation.mutateAsync,
    isReporting: mutation.isPending,
  };
};
