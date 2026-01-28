import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ReportWithProfiles {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  reporter?: {
    username: string;
    avatar_url: string | null;
  };
  reported_user?: {
    username: string;
    avatar_url: string | null;
  };
}

export const useIsAdmin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
  });
};

export const useAdminReports = (status?: ReportStatus) => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['admin-reports', status],
    queryFn: async (): Promise<ReportWithProfiles[]> => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: reports, error } = await query;

      if (error) throw error;
      if (!reports) return [];

      // Fetch profiles for reporters and reported users
      const userIds = [...new Set([
        ...reports.map(r => r.reporter_id),
        ...reports.map(r => r.reported_user_id),
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return reports.map(report => ({
        ...report,
        status: report.status as ReportStatus,
        reporter: profileMap.get(report.reporter_id),
        reported_user: profileMap.get(report.reported_user_id),
      }));
    },
    enabled: isAdmin === true,
  });
};

export const useUpdateReportStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      resolutionNotes 
    }: { 
      reportId: string; 
      status: ReportStatus; 
      resolutionNotes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'resolved' || status === 'dismissed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }

      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Signalement mis à jour');
    },
    onError: (error) => {
      console.error('Error updating report:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

export const useReportStats = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['report-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        reviewed: data?.filter(r => r.status === 'reviewed').length || 0,
        resolved: data?.filter(r => r.status === 'resolved').length || 0,
        dismissed: data?.filter(r => r.status === 'dismissed').length || 0,
      };

      return stats;
    },
    enabled: isAdmin === true,
  });
};
