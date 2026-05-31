import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContactAgePreference {
  id: string;
  user_id: string;
  min_age: number;
  max_age: number;
  is_active: boolean;
}

export const useContactAgeFilter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preference, isLoading } = useQuery({
    queryKey: ['contact-age-preference', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('contact_age_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ContactAgePreference | null;
    },
    enabled: !!user,
  });

  const savePreference = useMutation({
    mutationFn: async ({ minAge, maxAge, isActive }: { minAge: number; maxAge: number; isActive: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('contact_age_preferences')
        .upsert({
          user_id: user.id,
          min_age: minAge,
          max_age: maxAge,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-age-preference', user?.id] });
    },
  });

  return { preference, isLoading, savePreference };
};

/** Check if the current user can contact a target user based on age filter */
export const useCanContactUser = (targetUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-contact-user', user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return { allowed: true };
      const { data, error } = await supabase.rpc('can_contact_user_age', {
        _target_user_id: targetUserId,
      });
      if (error || !data) return { allowed: true };
      return data as { allowed: boolean; minAge?: number; maxAge?: number };
    },
    enabled: !!user && !!targetUserId,
    staleTime: 60000,
  });
};

/** Add an exception when the filtered user sends a message to someone */
export const useAddContactException = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allowedUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('contact_age_exceptions')
        .upsert({
          user_id: user.id,
          allowed_user_id: allowedUserId,
        }, { onConflict: 'user_id,allowed_user_id' });
      if (error) throw error;
    },
    onSuccess: (_, allowedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['can-contact-user'] });
    },
  });
};
