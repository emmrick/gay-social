import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyWithdrawalApproved, notifyWithdrawalRejected, notifyWithdrawalCompleted } from '@/services/pushNotificationService';

export type ModeratorTaskType = 
  | 'identity_verification' 
  | 'report_response' 
  | 'user_suspension' 
  | 'private_message_response'
  | 'verification_request'
  | 'credit_management'
  | 'content_moderation'
  | 'withdrawal_management'
  | 'promo_validation'
  | 'support_chat';

export interface TaskRate {
  id: string;
  task_type: ModeratorTaskType;
  rate_cents: number;
  description: string | null;
  is_active: boolean;
}

export interface ModeratorWallet {
  id: string;
  user_id: string;
  balance_cents: number;
  total_earned_cents: number;
  total_withdrawn_cents: number;
  created_at: string;
  updated_at: string;
}

export interface ModeratorEarning {
  id: string;
  user_id: string;
  task_type: ModeratorTaskType;
  amount_cents: number;
  target_user_id: string | null;
  target_entity_id: string | null;
  description: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_cents: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  rejection_reason: string | null;
  payment_reference: string | null;
}

const TASK_LABELS: Record<ModeratorTaskType, string> = {
  'identity_verification': 'Vérification d\'identité',
  'report_response': 'Réponse à un signalement',
  'user_suspension': 'Suspension/Blocage',
  'private_message_response': 'Réponse message privé',
  'verification_request': 'Demande de vérification',
  'credit_management': 'Gestion des crédits',
  'content_moderation': 'Modération de contenu',
  'withdrawal_management': 'Gestion des retraits',
  'promo_validation': 'Validation code promo',
  'support_chat': 'Support utilisateur',
};

export const getTaskLabel = (taskType: ModeratorTaskType): string => {
  return TASK_LABELS[taskType] || taskType;
};

export const formatCents = (cents: number): string => {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
};

// ========== TASK RATES ==========

export const useTaskRates = () => {
  return useQuery({
    queryKey: ['task-rates'],
    queryFn: async (): Promise<TaskRate[]> => {
      const { data, error } = await supabase
        .from('task_rates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as TaskRate[];
    },
  });
};

// All task rates (for admin, includes inactive)
export const useAllTaskRates = () => {
  return useQuery({
    queryKey: ['all-task-rates'],
    queryFn: async (): Promise<TaskRate[]> => {
      const { data, error } = await supabase
        .from('task_rates')
        .select('*')
        .order('task_type');

      if (error) throw error;
      return (data || []) as TaskRate[];
    },
  });
};

// Update task rate (admin only)
export const useUpdateTaskRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      rate_cents,
      description,
      is_active,
    }: {
      id: string;
      rate_cents: number;
      description: string | null;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from('task_rates')
        .update({
          rate_cents,
          description,
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-rates'] });
      queryClient.invalidateQueries({ queryKey: ['all-task-rates'] });
      toast.success('Tarif mis à jour');
    },
    onError: (error) => {
      console.error('Error updating task rate:', error);
      toast.error('Erreur lors de la mise à jour du tarif');
    },
  });
};

// ========== WALLET ==========

export const useModeratorWallet = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderator-wallet', user?.id],
    queryFn: async (): Promise<ModeratorWallet | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('moderator_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ModeratorWallet | null;
    },
    enabled: !!user?.id,
  });
};

// ========== EARNINGS ==========

export const useModeratorEarnings = (limit: number = 50) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderator-earnings', user?.id, limit],
    queryFn: async (): Promise<ModeratorEarning[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('moderator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ModeratorEarning[];
    },
    enabled: !!user?.id,
  });
};

// ========== RECORD EARNING ==========

export const useRecordEarning = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskType,
      targetUserId,
      targetEntityId,
      description,
    }: {
      taskType: ModeratorTaskType;
      targetUserId?: string;
      targetEntityId?: string;
      description?: string;
    }): Promise<boolean> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('record_moderator_earning', {
        _user_id: user.id,
        _task_type: taskType,
        _target_user_id: targetUserId || null,
        _target_entity_id: targetEntityId || null,
        _description: description || null,
      });

      if (error) {
        console.error('Error recording earning:', error);
        throw error;
      }

      return data === true;
    },
    onSuccess: (wasRecorded) => {
      if (wasRecorded) {
        queryClient.invalidateQueries({ queryKey: ['moderator-wallet'] });
        queryClient.invalidateQueries({ queryKey: ['moderator-earnings'] });
      }
    },
    onError: (error) => {
      console.error('Error recording earning:', error);
    },
  });
};

// ========== WITHDRAWAL ==========

export const useWithdrawalRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['withdrawal-requests', user?.id],
    queryFn: async (): Promise<WithdrawalRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WithdrawalRequest[];
    },
    enabled: !!user?.id,
  });
};

export const useRequestWithdrawal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; error?: string; amount_cents?: number }> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('request_withdrawal', {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as { success: boolean; error?: string; amount_cents?: number };
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['moderator-wallet'] });
        queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
        toast.success(`Demande de retrait de ${formatCents(result.amount_cents || 0)} envoyée`);
      } else {
        toast.error(result.error || 'Erreur lors de la demande');
      }
    },
    onError: (error) => {
      console.error('Error requesting withdrawal:', error);
      toast.error('Erreur lors de la demande de retrait');
    },
  });
};

// ========== ADMIN: ALL WITHDRAWALS ==========

export const useAllWithdrawalRequests = () => {
  return useQuery({
    queryKey: ['all-withdrawal-requests'],
    queryFn: async (): Promise<(WithdrawalRequest & { profile?: { username: string; avatar_url: string | null } })[]> => {
      const { data: requests, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      if (!requests?.length) return [];

      // Fetch profiles
      const userIds = [...new Set(requests.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return requests.map(r => ({
        ...(r as WithdrawalRequest),
        profile: profileMap.get(r.user_id),
      }));
    },
  });
};

export const useProcessWithdrawal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      rejectionReason,
      paymentReference,
    }: {
      requestId: string;
      status: 'approved' | 'rejected' | 'completed';
      rejectionReason?: string;
      paymentReference?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {
        status,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      };

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      if (paymentReference) {
        updateData.payment_reference = paymentReference;
      }

      // If rejected, refund the amount to the wallet
      if (status === 'rejected') {
        const { data: request } = await supabase
          .from('withdrawal_requests')
          .select('user_id, amount_cents')
          .eq('id', requestId)
          .single();

        if (request) {
          // Get current wallet and update manually
          const { data: wallet } = await supabase
            .from('moderator_wallets')
            .select('balance_cents, total_withdrawn_cents')
            .eq('user_id', request.user_id)
            .single();

          if (wallet) {
            await supabase
              .from('moderator_wallets')
              .update({
                balance_cents: wallet.balance_cents + request.amount_cents,
                total_withdrawn_cents: wallet.total_withdrawn_cents - request.amount_cents,
              })
              .eq('user_id', request.user_id);
          }
        }
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to the moderator
      const { data: reqData } = await supabase
        .from('withdrawal_requests')
        .select('user_id, amount_cents')
        .eq('id', requestId)
        .single();

      if (reqData) {
        if (status === 'approved') {
          await notifyWithdrawalApproved(reqData.user_id, reqData.amount_cents);
        } else if (status === 'rejected') {
          await notifyWithdrawalRejected(reqData.user_id, reqData.amount_cents, rejectionReason);
        } else if (status === 'completed') {
          await notifyWithdrawalCompleted(reqData.user_id, reqData.amount_cents);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['moderator-wallet'] });
      toast.success('Demande traitée');
    },
    onError: (error) => {
      console.error('Error processing withdrawal:', error);
      toast.error('Erreur lors du traitement');
    },
  });
};

// ========== EARNINGS STATS ==========

export const useEarningsStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['earnings-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get earnings grouped by task type
      const { data: earnings, error } = await supabase
        .from('moderator_earnings')
        .select('task_type, amount_cents')
        .eq('user_id', user.id);

      if (error) throw error;

      const byType: Record<string, { count: number; total: number }> = {};
      
      (earnings || []).forEach((e) => {
        const type = e.task_type as string;
        if (!byType[type]) {
          byType[type] = { count: 0, total: 0 };
        }
        byType[type].count++;
        byType[type].total += e.amount_cents;
      });

      return {
        byType,
        totalTasks: earnings?.length || 0,
        totalEarned: earnings?.reduce((sum, e) => sum + e.amount_cents, 0) || 0,
      };
    },
    enabled: !!user?.id,
  });
};

// ========== TODAY'S EARNINGS ==========

export interface TodayEarningsSummary {
  totalEarned: number;
  taskCount: number;
  byType: Record<string, { count: number; total: number }>;
  earnings: ModeratorEarning[];
}

export const useTodayEarnings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['today-earnings', user?.id],
    queryFn: async (): Promise<TodayEarningsSummary | null> => {
      if (!user?.id) return null;

      // Get today's start time in UTC
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();

      const { data: earnings, error } = await supabase
        .from('moderator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const byType: Record<string, { count: number; total: number }> = {};
      
      (earnings || []).forEach((e) => {
        const type = e.task_type as string;
        if (!byType[type]) {
          byType[type] = { count: 0, total: 0 };
        }
        byType[type].count++;
        byType[type].total += e.amount_cents;
      });

      return {
        totalEarned: earnings?.reduce((sum, e) => sum + e.amount_cents, 0) || 0,
        taskCount: earnings?.length || 0,
        byType,
        earnings: (earnings || []) as ModeratorEarning[],
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
