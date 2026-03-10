import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureToggle {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  category: string;
  icon: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const useFeatureToggles = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['feature-toggles'],
    queryFn: async (): Promise<FeatureToggle[]> => {
      const { data, error } = await supabase
        .from('feature_toggles')
        .select('*')
        .order('category', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;
      return (data || []) as FeatureToggle[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('feature-toggles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_toggles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feature-toggles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

/** Check if a specific feature is enabled. Returns true if not found (default enabled). */
export const useIsFeatureEnabled = (featureKey: string): boolean => {
  const { data: toggles } = useFeatureToggles();
  if (!toggles) return true; // Default enabled while loading
  const toggle = toggles.find(t => t.feature_key === featureKey);
  return toggle ? toggle.is_enabled : true;
};

/** Returns a map of feature_key → is_enabled for quick lookups */
export const useFeatureFlags = (): Record<string, boolean> => {
  const { data: toggles } = useFeatureToggles();
  if (!toggles) return {};
  return toggles.reduce((acc, t) => {
    acc[t.feature_key] = t.is_enabled;
    return acc;
  }, {} as Record<string, boolean>);
};

/** Admin mutation to toggle a feature */
export const useToggleFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_toggles')
        .update({ is_enabled, updated_at: new Date().toISOString() } as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-toggles'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
};
