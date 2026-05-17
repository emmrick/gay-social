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
  ad_review: '📢 Examen annonce publicitaire',
  user_suspension: '🔒 Suspension utilisateur',
  credit_management: '💰 Gestion de crédits',
  withdrawal_management: '🏦 Demande de retrait',
  promo_validation: '🎟️ Validation code promo',
  support_chat: '🆘 Support utilisateur',
  tween_review: '🐦 Examen de Tween signalé',
  photo_exchange_review: '🖼️ Échange de photos privé',
};

const TASK_TYPE_SECTIONS: Record<string, string> = {
  identity_verification: 'verification',
  report_review: 'reports',
  content_moderation: 'moderation',
  ad_review: 'ads',
  user_suspension: 'users',
  credit_management: 'credits',
  withdrawal_management: 'credits',
  promo_validation: 'promo',
  support_chat: 'support',
  tween_review: 'reports',
  photo_exchange_review: 'moderation',
};

/** Get entity ID from task metadata for direct navigation */
export const getTaskEntityId = (task: ModerationTask): string | null => {
  if (task.metadata?.ad_id) return task.metadata.ad_id as string;
  return task.target_entity_id;
};

export const getTaskTypeLabel = (type: string) => TASK_TYPE_LABELS[type] || type;
export const getTaskTypeSection = (type: string) => TASK_TYPE_SECTIONS[type] || 'reports';

export const formatCentsReward = (cents: number) => {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
};

// ─── Mission toggle (persisted in localStorage) ───
const MISSION_ACTIVE_KEY = 'moderation-missions-active';
const MISSION_ACTIVE_EVENT = 'moderation-missions-active-change';
const MISSION_REFUSE_COOLDOWN_KEY = 'moderation-missions-refuse-cooldown-until';
const MISSION_REFUSE_COOLDOWN_EVENT = 'moderation-missions-refuse-cooldown-change';

const readMissionActiveState = () => {
  try {
    return localStorage.getItem(MISSION_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistMissionActiveState = (value: boolean) => {
  try {
    localStorage.setItem(MISSION_ACTIVE_KEY, String(value));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MISSION_ACTIVE_EVENT, { detail: value }));
  }
};

const readMissionRefuseCooldownUntil = () => {
  try {
    const raw = localStorage.getItem(MISSION_REFUSE_COOLDOWN_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const persistMissionRefuseCooldownUntil = (value: number) => {
  try {
    if (value > Date.now()) {
      localStorage.setItem(MISSION_REFUSE_COOLDOWN_KEY, String(value));
    } else {
      localStorage.removeItem(MISSION_REFUSE_COOLDOWN_KEY);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MISSION_REFUSE_COOLDOWN_EVENT, { detail: value }));
  }
};

export const isMissionRefuseCooldownActive = () => readMissionRefuseCooldownUntil() > Date.now();

export const startMissionRefuseCooldown = (durationMs: number) => {
  const until = Date.now() + durationMs;
  persistMissionRefuseCooldownUntil(until);
  return until;
};

export const useMissionToggle = () => {
  const [isActive, setIsActive] = useState<boolean>(readMissionActiveState);

  useEffect(() => {
    const syncState = (value?: boolean) => {
      setIsActive(typeof value === 'boolean' ? value : readMissionActiveState());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === MISSION_ACTIVE_KEY) {
        syncState(event.newValue === 'true');
      }
    };

    const handleLocalSync = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      syncState(customEvent.detail);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(MISSION_ACTIVE_EVENT, handleLocalSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(MISSION_ACTIVE_EVENT, handleLocalSync as EventListener);
    };
  }, []);

  const toggle = useCallback(() => {
    setIsActive(prev => {
      const next = !prev;
      persistMissionActiveState(next);
      if (next) {
        toast.success('Missions activées — vous recevrez de nouvelles missions.');
      } else {
        toast.info('Missions désactivées — vous ne recevrez plus de nouvelles missions après la mission en cours.');
      }
      return next;
    });
  }, []);

  const setActive = useCallback((value: boolean) => {
    setIsActive(value);
    persistMissionActiveState(value);
  }, []);

  return { isActive, toggle, setActive };
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
  const [cooldownUntil, setCooldownUntil] = useState(readMissionRefuseCooldownUntil);
  const cooldownActive = cooldownUntil > Date.now();

  useEffect(() => {
    const syncCooldown = (value?: number) => {
      const nextValue = typeof value === 'number' ? value : readMissionRefuseCooldownUntil();
      setCooldownUntil(nextValue > Date.now() ? nextValue : 0);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === MISSION_REFUSE_COOLDOWN_KEY) {
        syncCooldown(event.newValue ? Number(event.newValue) : 0);
      }
    };

    const handleLocalSync = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      syncCooldown(customEvent.detail);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(MISSION_REFUSE_COOLDOWN_EVENT, handleLocalSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(MISSION_REFUSE_COOLDOWN_EVENT, handleLocalSync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!cooldownActive) return;

    const timeout = window.setTimeout(() => {
      setCooldownUntil(0);
      invalidateAllTaskQueries(queryClient);
    }, Math.max(0, cooldownUntil - Date.now()) + 50);

    return () => window.clearTimeout(timeout);
  }, [cooldownActive, cooldownUntil, queryClient]);

  const query = useQuery({
    queryKey: ['moderation-tasks-available', user?.id],
    queryFn: async (): Promise<ModerationTask[]> => {
      if (!user?.id) return [];
      if (cooldownActive) return [];

      // get_exclusive_next_task already handles expiring stale offers
      // and recycling refused tasks internally — no redundant calls needed
      const { data, error } = await supabase.rpc('get_exclusive_next_task', {
        _user_id: user.id,
        _offer_ttl_seconds: 60,
      });

      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        refused_by: t.refused_by || [],
        metadata: t.metadata || {},
      })) as ModerationTask[];
    },
    enabled: !!user?.id,
    refetchInterval: cooldownActive ? false : 10000,
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
          if (isMissionRefuseCooldownActive()) return;
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
