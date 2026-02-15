import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMaintenanceMode = () => {
  return useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_mode')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as { id: string; is_active: boolean; message: string | null; activated_at: string | null; estimated_end_at: string | null };
    },
    staleTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 60, // poll every minute
  });
};

export const useToggleMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isActive, message, estimatedEndAt }: { isActive: boolean; message?: string; estimatedEndAt?: string | null }) => {
      // Get the single row id first
      const { data: current } = await supabase
        .from('maintenance_mode')
        .select('id')
        .limit(1)
        .single();

      if (!current) throw new Error('Maintenance config not found');

      const { error } = await supabase
        .from('maintenance_mode')
        .update({
          is_active: isActive,
          message: message || 'Le site est en maintenance. Veuillez réessayer plus tard.',
          activated_at: isActive ? new Date().toISOString() : null,
          estimated_end_at: estimatedEndAt !== undefined ? estimatedEndAt : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
      toast.success(variables.isActive ? 'Mode maintenance activé' : 'Mode maintenance désactivé');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du mode maintenance');
    },
  });
};
