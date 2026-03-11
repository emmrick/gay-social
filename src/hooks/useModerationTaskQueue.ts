import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ModerationTask {
  id: string;
  task_type: string;
  target_entity_id: string | null;
  target_user_id: string | null;
  reward_cents: number;
  status: string;
  reserved_by: string | null;
  reserved_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  refused_by: string[];
  metadata: Record<string, unknown>;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  identity_verification: '🪪 Vérification d\'identité',
  report_review: '🚨 Examen de signalement',
  content_moderation: '📸 Modération de contenu',
  user_suspension: '🔒 Suspension utilisateur',
  credit_management: '💰 Gestion de crédits',
  withdrawal_management: '🏦 Demande de retrait',
  promo_validation: '🎟️ Validation code promo',
  support_chat: '🆘 Support utilisateur',
};

const TASK_TYPE_SECTIONS: Record<string, string> = {
  identity_verification: 'verification',
  report_review: 'reports',
  content_moderation: 'moderation',
  user_suspension: 'users',
  credit_management: 'credits',
  withdrawal_management: 'credits',
  promo_validation: 'promo',
  support_chat: 'support',
};

export const getTaskTypeLabel = (type: string) => TASK_TYPE_LABELS[type] || type;
export const getTaskTypeSection = (type: string) => TASK_TYPE_SECTIONS[type] || 'reports';

export const formatCentsReward = (cents: number) => {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
};

// ─── Mission toggle (persisted in localStorage) ───
const MISSION_ACTIVE_KEY = 'moderation-missions-active';

export const useMissionToggle = () => {
  const [isActive, setIsActive] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(MISSION_ACTIVE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setIsActive(prev => {
      const next = !prev;
      try { localStorage.setItem(MISSION_ACTIVE_KEY, String(next)); } catch {}
      if (next) {
        toast.success('Missions activées — vous recevrez de nouvelles missions.');
      } else {
        toast.info('Missions désactivées — vous ne recevrez plus de nouvelles missions après la mission en cours.');
      }
      return next;
    });
  }, []);

  return { isActive, toggle };
};

// ─── Shared invalidation helper ───
export const invalidateAllTaskQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
  queryClient.invalidateQueries({ queryKey: ['moderation-task-active'] });
  queryClient.invalidateQueries({ queryKey: ['moderation-tasks-pending-all'] });
};

// ─── Admin: all pending/reserved tasks ───
export const usePendingTasksHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderation-tasks-pending-all'],
    queryFn: async (): Promise<ModerationTask[]> => {
      if (!user?.id) return [];

      await supabase.rpc('expire_stale_moderation_tasks');
      await supabase.rpc('recycle_fully_refused_tasks');

      const { data, error } = await supabase
        .from('moderation_tasks')
        .select('*')
        .in('status', ['pending', 'reserved'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        refused_by: t.refused_by || [],
        metadata: t.metadata || {},
      })) as ModerationTask[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};

// ─── Exclusive next task for current moderator (Uber Eats style) ───
// Uses get_exclusive_next_task RPC which atomically offers ONE task to ONE moderator
export const useAvailableTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['moderation-tasks-available', user?.id],
    queryFn: async (): Promise<ModerationTask[]> => {
      if (!user?.id) return [];

      // First expire stale tasks and recycle fully refused ones
      await supabase.rpc('expire_stale_moderation_tasks');
      await supabase.rpc('recycle_fully_refused_tasks');

      // Use exclusive offering: atomically assigns ONE task to this user only
      const { data, error } = await supabase.rpc('get_exclusive_next_task', {
        _user_id: user.id,
      });

      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        refused_by: t.refused_by || [],
        metadata: t.metadata || {},
      })) as ModerationTask[];
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Poll every 10s to check for new exclusive offers (60s TTL)
  });

  // Realtime: instant refresh on any task change
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('moderation-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moderation_tasks',
        },
        () => {
          invalidateAllTaskQueries(queryClient);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// ─── Next task in the queue (exclusive to this moderator) ───
export const useNextTask = () => {
  const { data: availableTasks, isLoading } = useAvailableTasks();
  const nextTask = availableTasks && availableTasks.length > 0 ? availableTasks[0] : null;
  // Queue length is always 0 or 1 since we only get our exclusive offer
  const queueLength = availableTasks?.length ?? 0;
  return { nextTask, queueLength, isLoading };
};

// ─── Current user's active (reserved) task ───
export const useActiveTask = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderation-task-active', user?.id],
    queryFn: async (): Promise<ModerationTask | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('moderation_tasks')
        .select('*')
        .eq('reserved_by', user.id)
        .eq('status', 'reserved')
        .order('reserved_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        refused_by: (data as any).refused_by || [],
        metadata: (data as any).metadata || {},
      } as ModerationTask;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};

// ─── Reserve (accept) a task ───
export const useReserveTask = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('reserve_moderation_task', {
        _task_id: taskId,
        _user_id: user.id,
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      invalidateAllTaskQueries(queryClient);
      toast.success('Mission acceptée ! Vous avez 5 minutes pour l\'exécuter.');
    },
    onError: (error: Error) => {
      invalidateAllTaskQueries(queryClient);
      toast.error(error.message);
    },
  });
};

// ─── Refuse (skip) a task — backend call so it's durable ───
export const useRefuseTask = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('refuse_moderation_task', {
        _task_id: taskId,
        _user_id: user.id,
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      invalidateAllTaskQueries(queryClient);
      toast.info('Mission passée — la suivante arrive.');
    },
    onError: (error: Error) => {
      invalidateAllTaskQueries(queryClient);
      toast.error(error.message);
    },
  });
};

// ─── Complete a task ───
export const useCompleteTask = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get task details before completing (for support ticket closing)
      const { data: taskData } = await supabase
        .from('moderation_tasks')
        .select('task_type, metadata, target_user_id')
        .eq('id', taskId)
        .single();

      const { data, error } = await supabase.rpc('complete_moderation_task', {
        _task_id: taskId,
        _user_id: user.id,
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);

      // If support_chat task, close the ticket and notify user
      if (taskData?.task_type === 'support_chat') {
        const metadata = taskData.metadata as any;
        const ticketId = metadata?.ticket_id;
        const ticketNumber = metadata?.ticket_number;
        if (ticketId) {
          await supabase
            .from('support_tickets' as any)
            .update({ status: 'closed', closed_at: new Date().toISOString() } as any)
            .eq('id', ticketId);

          // Import dynamically to avoid circular deps
          const { notifySupportTicketClosed } = await import('@/services/pushNotificationService');
          if (taskData.target_user_id && ticketNumber) {
            await notifySupportTicketClosed(taskData.target_user_id, ticketNumber);
          }
        }
      }

      return result;
    },
    onSuccess: (data) => {
      invalidateAllTaskQueries(queryClient);
      if (data.reward_cents > 0) {
        toast.success(`Mission terminée ! +${formatCentsReward(data.reward_cents)}`);
      } else {
        toast.success('Mission terminée !');
      }
    },
    onError: (error: Error) => {
      invalidateAllTaskQueries(queryClient);
      toast.error(error.message);
    },
  });
};

// ─── Recycle a single task (reset refused_by) ───
export const useRecycleTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('moderation_tasks')
        .update({ 
          refused_by: [], 
          offered_to: null, 
          offered_at: null, 
          reserved_by: null, 
          reserved_at: null, 
          status: 'pending',
          updated_at: new Date().toISOString() 
        } as any)
        .eq('id', taskId)
        .in('status', ['pending', 'reserved']);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllTaskQueries(queryClient);
      toast.success('Mission re-proposée aux modérateurs.');
    },
    onError: () => {
      toast.error('Erreur lors de la re-proposition.');
    },
  });
};

// ─── Create a task in the queue ───
export const useCreateModerationTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      task_type: string;
      target_entity_id?: string;
      target_user_id?: string;
      reward_cents: number;
      description?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from('moderation_tasks')
        .insert({
          task_type: task.task_type,
          target_entity_id: task.target_entity_id || null,
          target_user_id: task.target_user_id || null,
          reward_cents: task.reward_cents,
          description: task.description || null,
          metadata: task.metadata || {},
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllTaskQueries(queryClient);
    },
  });
};
