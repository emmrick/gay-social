import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
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
  content_moderation: '💬 Modération de contenu',
  user_suspension: '🔒 Suspension utilisateur',
  credit_management: '💰 Gestion de crédits',
};

const TASK_TYPE_SECTIONS: Record<string, string> = {
  identity_verification: 'verification',
  report_review: 'reports',
  content_moderation: 'moderation',
  user_suspension: 'users',
  credit_management: 'credits',
};

export const getTaskTypeLabel = (type: string) => TASK_TYPE_LABELS[type] || type;
export const getTaskTypeSection = (type: string) => TASK_TYPE_SECTIONS[type] || 'reports';

export const formatCentsReward = (cents: number) => {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
};

// Hook to manage mission availability toggle (persisted in localStorage)
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

// Hook to get ALL pending tasks (for admin history panel)
export const usePendingTasksHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moderation-tasks-pending-all'],
    queryFn: async (): Promise<ModerationTask[]> => {
      if (!user?.id) return [];

      await supabase.rpc('expire_stale_moderation_tasks');

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
    refetchInterval: 15000,
  });
};

// Hook to get available tasks for the current user
export const useAvailableTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['moderation-tasks-available', user?.id],
    queryFn: async (): Promise<ModerationTask[]> => {
      if (!user?.id) return [];

      // First expire stale tasks
      await supabase.rpc('expire_stale_moderation_tasks');

      const { data, error } = await supabase
        .from('moderation_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter out tasks refused by this user
      return (data || [])
        .filter((t: any) => !t.refused_by?.includes(user.id))
        .map((t: any) => ({
          ...t,
          refused_by: t.refused_by || [],
          metadata: t.metadata || {},
        })) as ModerationTask[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Poll every 15s
  });

  // Realtime subscription for instant updates
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
          queryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
          queryClient.invalidateQueries({ queryKey: ['moderation-task-active'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Hook to get the current user's active (reserved) task
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
    refetchInterval: 10000,
  });
};

// Reserve a task
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
      queryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-task-active'] });
      toast.success('Tâche réservée ! Vous avez 5 minutes pour l\'exécuter.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Refuse a task
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
      queryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-task-active'] });
      toast.info('Tâche refusée, elle sera proposée à un autre modérateur.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Complete a task
export const useCompleteTask = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('complete_moderation_task', {
        _task_id: taskId,
        _user_id: user.id,
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-task-active'] });
      if (data.reward_cents > 0) {
        toast.success(`Tâche terminée ! +${formatCentsReward(data.reward_cents)}`);
      } else {
        toast.success('Tâche terminée !');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Create a task in the queue
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
      queryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
    },
  });
};
