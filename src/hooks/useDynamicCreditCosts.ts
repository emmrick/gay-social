import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Fallback defaults if DB is unreachable
const FALLBACK_COSTS: Record<string, number> = {
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
};

export const useDynamicCreditCosts = () => {
  return useQuery({
    queryKey: ['credit-costs'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('credit_costs' as any)
        .select('cost_key, cost_value');

      if (error || !data) {
        console.error('Error fetching credit costs:', error);
        return FALLBACK_COSTS;
      }

      const costs: Record<string, number> = { ...FALLBACK_COSTS };
      (data as any[]).forEach((row) => {
        costs[row.cost_key] = Number(row.cost_value);
      });
      return costs;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 min
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

      // Log the change in audit table
      const { error: auditError } = await supabase
        .from('credit_cost_audit_log' as any)
        .insert({
          credit_cost_id: id,
          cost_key,
          old_value,
          new_value: cost_value,
          changed_by: (await supabase.auth.getUser()).data.user?.id,
        } as any);

      if (auditError) console.error('Audit log error:', auditError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-credit-costs'] });
      queryClient.invalidateQueries({ queryKey: ['credit-costs'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cost-audit-log'] });
      toast.success('Tarif mis à jour');
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
