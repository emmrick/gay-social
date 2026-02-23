import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ReportReason = 
  | 'harassment'
  | 'inappropriate_content'
  | 'spam'
  | 'fake_profile'
  | 'underage'
  | 'other';

export interface CreateReportData {
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
}

export const useReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has already reported this person
  const useHasReported = (reportedUserId: string) => {
    return useQuery({
      queryKey: ['has-reported', user?.id, reportedUserId],
      queryFn: async () => {
        if (!user?.id || !reportedUserId) return false;

        const { data, error } = await supabase
          .from('reports')
          .select('id')
          .eq('reporter_id', user.id)
          .eq('reported_user_id', reportedUserId)
          .maybeSingle();

        if (error) throw error;
        return !!data;
      },
      enabled: !!user?.id && !!reportedUserId,
    });
  };

  // Get user's submitted reports
  const useMyReports = () => {
    return useQuery({
      queryKey: ['my-reports', user?.id],
      queryFn: async () => {
        if (!user?.id) return [];

        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('reporter_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      enabled: !!user?.id,
    });
  };

  // Create a report
  const createReport = useMutation({
    mutationFn: async ({ reportedUserId, reason, description }: CreateReportData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reason,
          description: description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // AI moderation disabled
      // The report is created and will be handled manually by moderators

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['has-reported', user?.id, variables.reportedUserId] });
      queryClient.invalidateQueries({ queryKey: ['my-reports', user?.id] });
      toast.success('Signalement envoyé', {
        description: 'Merci pour votre signalement. Un modérateur analysera la situation dans les plus brefs délais.',
      });
    },
    onError: (error) => {
      console.error('Error creating report:', error);
      toast.error('Erreur', {
        description: 'Impossible d\'envoyer le signalement. Veuillez réessayer.',
      });
    },
  });

  return {
    createReport,
    useHasReported,
    useMyReports,
  };
};

// Report reason labels in French
export const reportReasonLabels: Record<ReportReason, string> = {
  harassment: 'Harcèlement',
  inappropriate_content: 'Contenu inapproprié',
  spam: 'Spam',
  fake_profile: 'Faux profil',
  underage: 'Utilisateur mineur',
  other: 'Autre',
};

export const reportReasonDescriptions: Record<ReportReason, string> = {
  harassment: 'Comportement agressif, insultes ou menaces',
  inappropriate_content: 'Photos ou messages explicites non consentis',
  spam: 'Messages répétitifs ou publicités',
  fake_profile: 'Usurpation d\'identité ou photos volées',
  underage: 'L\'utilisateur semble avoir moins de 18 ans',
  other: 'Autre raison non listée',
};
