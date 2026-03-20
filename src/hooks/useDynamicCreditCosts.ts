import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreditCost {
  id: string;
  cost_key: string;
  cost_value: number;
  label: string;
  category: string;
  updated_at: string;
}

// Original default costs (used to detect promos)
export const DEFAULT_COSTS: Record<string, number> = {
  private_message_text: 0.1,
  private_message_media: 0.2,
  group_message_text: 0.1,
  group_message_media: 0.2,
  ephemeral_media: 0.5,
  album_share: 1.0,
  album_create: 10.0,
  profile_reaction: 0.3,
  profile_view: 0.1,
  nearby_unlock_30: 5.0,
  nearby_unlock_130: 10.0,
  swipe_like: 0.5,
  swipe_dislike: 0.2,
  swipe_hide: 0.1,
  swipe_start_conversation: 0.2,
  join_extra_group: 5.0,
  chatbot_message: 0.5,
  chatbot_info: 2.5,
  chatbot_info_extra: 20.0,
  chatbot_activate: 10.0,
  referral_reward: 30.0,
  mission_identity_verification: 30.0,
  mission_add_photos: 2.0,
  mission_complete_profile: 3.0,
  mission_send_messages: 1.0,
};

export const useDynamicCreditCosts = () => {
  const queryClient = useQueryClient();

  // Realtime subscription to credit_costs changes
  useEffect(() => {
    const channel = supabase
      .channel('credit-costs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_costs' },
        (payload) => {
          console.log('[Realtime] credit_costs changed:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['credit-costs'] });
          queryClient.invalidateQueries({ queryKey: ['admin-credit-costs'] });

          // Show toast to user about price change
          if (payload.eventType === 'UPDATE') {
            const newRow = payload.new as any;
            const oldRow = payload.old as any;
            if (newRow && oldRow && newRow.cost_value !== oldRow.cost_value) {
              const isPromo = newRow.cost_value < (DEFAULT_COSTS[newRow.cost_key] ?? oldRow.cost_value);
              if (isPromo) {
                toast.info('🎉 Promotion en cours !', {
                  description: `${newRow.label || newRow.cost_key} : ${oldRow.cost_value} → ${newRow.cost_value} crédits`,
                  duration: 6000,
                });
              } else {
                toast.info('💰 Tarif mis à jour', {
                  description: `${newRow.label || newRow.cost_key} : ${newRow.cost_value} crédits`,
                  duration: 4000,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['credit-costs'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('credit_costs' as any)
        .select('cost_key, cost_value');

      if (error || !data) {
        console.error('Error fetching credit costs:', error);
        return DEFAULT_COSTS;
      }

      const costs: Record<string, number> = { ...DEFAULT_COSTS };
      (data as any[]).forEach((row) => {
        costs[row.cost_key] = Number(row.cost_value);
      });
      return costs;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAdminCreditCosts = () => {
  return useQuery({
    queryKey: ['admin-credit-costs'],
    queryFn: async (): Promise<CreditCost[]> => {
      const { data, error } = await supabase
        .from('credit_costs' as any)
        .select('*')
        .order('category')
        .order('cost_key');

      if (error) throw error;
      return (data || []) as any as CreditCost[];
    },
  });
};

export const useUpdateCreditCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cost_key, old_value, cost_value }: { id: string; cost_key: string; old_value: number; cost_value: number }) => {
      const { error } = await supabase
        .from('credit_costs' as any)
        .update({ cost_value } as any)
        .eq('id', id);

      if (error) throw error;

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Log the change in audit table
      const { error: auditError } = await supabase
        .from('credit_cost_audit_log' as any)
        .insert({
          credit_cost_id: id,
          cost_key,
          old_value,
          new_value: cost_value,
          changed_by: userId,
        } as any);

      if (auditError) console.error('Audit log error:', auditError);

      // Auto-announce: fetch the label for a nice message
      const { data: costRow } = await supabase
        .from('credit_costs' as any)
        .select('label')
        .eq('id', id)
        .single();

      const label = (costRow as any)?.label || cost_key;
      const isPromo = cost_value < (DEFAULT_COSTS[cost_key] ?? old_value);
      const isFree = cost_value === 0;

      // Create a global notification for all users
      let title: string;
      let message: string;

      if (isFree) {
        title = '🎁 Action gratuite !';
        message = `${label} est maintenant gratuit ! Profitez-en.`;
      } else if (isPromo) {
        const discount = Math.round((1 - cost_value / old_value) * 100);
        title = '🔥 Promotion en cours !';
        message = `${label} passe de ${old_value} à ${cost_value} crédits (-${discount}%).`;
      } else {
        title = '💰 Tarif mis à jour';
        message = `${label} : ${old_value} → ${cost_value} crédits.`;
      }

      // Broadcast notification to all users via edge function
      try {
        await supabase.functions.invoke('broadcast-notification', {
          body: {
            title,
            body: message,
            target_type: 'all',
          },
        });
      } catch (e) {
        console.warn('Failed to broadcast price change notification:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-credit-costs'] });
      queryClient.invalidateQueries({ queryKey: ['credit-costs'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cost-audit-log'] });
      toast.success('Tarif mis à jour et annonce envoyée');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

interface AuditLogEntry {
  id: string;
  credit_cost_id: string;
  cost_key: string;
  old_value: number;
  new_value: number;
  changed_by: string;
  changed_at: string;
}

export const useCreditCostAuditLog = () => {
  return useQuery({
    queryKey: ['credit-cost-audit-log'],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from('credit_cost_audit_log' as any)
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as any as AuditLogEntry[];
    },
  });
};
