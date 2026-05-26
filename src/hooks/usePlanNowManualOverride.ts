import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Manual override : quand l'utilisateur (recipient) clique "Personnaliser la
 * réponse" sur une conversation, on désactive les auto-réponses Plan Now
 * pour cet échange précis.
 */
export const usePlanNowManualOverride = (otherUserId?: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: hasOverride = false } = useQuery({
    queryKey: ['plan-now-override', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return false;
      const { data, error } = await supabase
        .from('plan_now_manual_overrides' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('other_user_id', otherUserId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id && !!otherUserId,
  });

  const enableOverride = useMutation({
    mutationFn: async () => {
      if (!user?.id || !otherUserId) return;
      const { error } = await supabase.from('plan_now_manual_overrides' as any).insert({
        user_id: user.id,
        other_user_id: otherUserId,
      } as any);
      if (error && !String(error.message).includes('duplicate')) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-now-override', user?.id, otherUserId] });
      toast.success('Réponses manuelles activées pour ce chat');
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const disableOverride = useMutation({
    mutationFn: async () => {
      if (!user?.id || !otherUserId) return;
      const { error } = await supabase
        .from('plan_now_manual_overrides' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('other_user_id', otherUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-now-override', user?.id, otherUserId] });
      toast.success('Auto-réponses réactivées pour ce chat');
    },
  });

  return {
    hasOverride,
    enableOverride: enableOverride.mutate,
    disableOverride: disableOverride.mutate,
    isMutating: enableOverride.isPending || disableOverride.isPending,
  };
};
