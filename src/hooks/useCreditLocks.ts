import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from './useCredits';

export type LockableCredit = 'passive' | 'bonus' | 'purchased';

export const useCreditLocks = () => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const queryClient = useQueryClient();

  const locks = {
    passive: credits?.lock_passive ?? false,
    bonus: credits?.lock_bonus ?? false,
    purchased: credits?.lock_purchased ?? false,
  };

  const toggleLock = useMutation({
    mutationFn: async ({ type, locked }: { type: LockableCredit; locked: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const column = `lock_${type}`;
      const { error } = await supabase
        .from('user_credits')
        .update({ [column]: locked, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
    },
  });

  return {
    locks,
    toggleLock: (type: LockableCredit, locked: boolean) =>
      toggleLock.mutateAsync({ type, locked }),
    isToggling: toggleLock.isPending,
  };
};
