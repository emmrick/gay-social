import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ModerationActionType = 
  | 'user_suspended'
  | 'user_unblocked'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_requested'
  | 'report_resolved'
  | 'report_dismissed'
  | 'manual_verification'
  | 'username_changed';

export interface ModerationAction {
  id: string;
  target_user_id: string;
  performed_by: string;
  action_type: ModerationActionType;
  details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  performer?: {
    username: string;
    avatar_url: string | null;
  };
}

export const useModerationActions = (targetUserId?: string) => {
  return useQuery({
    queryKey: ['moderation-actions', targetUserId],
    queryFn: async (): Promise<ModerationAction[]> => {
      let query = supabase
        .from('moderation_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (targetUserId) {
        query = query.eq('target_user_id', targetUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      // Fetch performer profiles
      const performerIds = [...new Set(data.map((a: Record<string, unknown>) => a.performed_by as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', performerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map((action: Record<string, unknown>) => ({
        id: action.id as string,
        target_user_id: action.target_user_id as string,
        performed_by: action.performed_by as string,
        action_type: action.action_type as ModerationActionType,
        details: action.details as string | null,
        metadata: (action.metadata as Record<string, unknown>) || {},
        created_at: action.created_at as string,
        performer: profileMap.get(action.performed_by as string),
      }));
    },
    enabled: true,
  });
};

export const useLogModerationAction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      actionType,
      details,
      metadata,
    }: {
      targetUserId: string;
      actionType: ModerationActionType;
      details?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const insertData = {
        target_user_id: targetUserId,
        performed_by: user.id,
        action_type: actionType,
        details: details || null,
        metadata: metadata || {},
      };

      const { error } = await supabase
        .from('moderation_actions')
        .insert([insertData] as never);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moderation-actions'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-actions', variables.targetUserId] });
    },
  });
};

export const getActionTypeLabel = (type: ModerationActionType): string => {
  const labels: Record<ModerationActionType, string> = {
    user_suspended: 'Suspension',
    user_unblocked: 'Déblocage',
    verification_approved: 'Vérification approuvée',
    verification_rejected: 'Vérification refusée',
    verification_requested: 'Demande de vérification',
    report_resolved: 'Signalement résolu',
    report_dismissed: 'Signalement rejeté',
    manual_verification: 'Vérification manuelle',
    username_changed: 'Surnom modifié',
  };
  return labels[type];
};

export const getActionTypeColor = (type: ModerationActionType): string => {
  const colors: Record<ModerationActionType, string> = {
    user_suspended: 'text-destructive',
    user_unblocked: 'text-green-500',
    verification_approved: 'text-green-500',
    verification_rejected: 'text-destructive',
    verification_requested: 'text-blue-500',
    report_resolved: 'text-green-500',
    report_dismissed: 'text-muted-foreground',
    manual_verification: 'text-green-500',
    username_changed: 'text-blue-500',
  };
  return colors[type];
};
