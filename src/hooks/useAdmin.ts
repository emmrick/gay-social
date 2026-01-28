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

export interface UserBlock {
  id: string;
  user_id: string;
  blocked_by: string;
  reason: string | null;
  blocked_at: string;
  unblocked_at: string | null;
  is_active: boolean;
  user?: {
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

// ========== USER BLOCKING ==========

export const useIsUserBlocked = (userId: string) => {
  return useQuery({
    queryKey: ['user-blocked', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('is_user_blocked', {
        _user_id: userId,
      });

      if (error) {
        console.error('Error checking block status:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!userId,
  });
};

export const useBlockedUsers = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: async (): Promise<UserBlock[]> => {
      const { data: blocks, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      if (!blocks) return [];

      // Fetch profiles for blocked users
      const userIds = blocks.map(b => b.user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return blocks.map(block => ({
        ...block,
        user: profileMap.get(block.user_id),
      }));
    },
    enabled: isAdmin === true,
  });
};

export const useBlockUser = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      reason 
    }: { 
      userId: string; 
      reason?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if user is already blocked
      const { data: existing } = await supabase
        .from('user_blocks')
        .select('id, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing && existing.is_active) {
        throw new Error('User is already blocked');
      }

      if (existing) {
        // Reactivate existing block
        const { error } = await supabase
          .from('user_blocks')
          .update({
            is_active: true,
            blocked_by: user.id,
            blocked_at: new Date().toISOString(),
            reason: reason || null,
            unblocked_at: null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new block
        const { error } = await supabase
          .from('user_blocks')
          .insert({
            user_id: userId,
            blocked_by: user.id,
            reason: reason || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-blocked'] });
      toast.success('Utilisateur bloqué');
    },
    onError: (error) => {
      console.error('Error blocking user:', error);
      toast.error('Erreur lors du blocage');
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_blocks')
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-blocked'] });
      toast.success('Utilisateur débloqué');
    },
    onError: (error) => {
      console.error('Error unblocking user:', error);
      toast.error('Erreur lors du déblocage');
    },
  });
};
