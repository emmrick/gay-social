import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { emitCreditDeduction } from '@/components/credits/CreditDeductionAnimation';

// Global query client reference for standalone functions
let globalQueryClient: QueryClient | null = null;

export const setGlobalQueryClient = (client: QueryClient) => {
  globalQueryClient = client;
};

// Helper to invalidate credit queries from standalone functions
const invalidateCreditQueries = (userId: string) => {
  if (globalQueryClient) {
    globalQueryClient.invalidateQueries({ queryKey: ['user-credits', userId] });
    globalQueryClient.invalidateQueries({ queryKey: ['credit-transactions', userId] });
  }
};

// Credit costs for each action
export const CREDIT_COSTS = {
  private_message_text: 0.1,
  private_message_media: 0.2,
  group_message_text: 0.1,
  group_message_media: 0.2,
  ephemeral_media: 0.5,
  album_share: 1.0,
  album_create: 10.0, // Only for 2nd+ albums
  profile_reaction: 0.3,
  profile_view: 0.1,
  nearby_unlock_30: 5.0,
  nearby_unlock_130: 10.0,
  // Swipe costs
  swipe_like: 0.5,
  swipe_dislike: 0.2,
  swipe_hide: 0.1,
  swipe_start_conversation: 0.2,
  // Group costs
  join_extra_group: 5.0, // Joining a group outside home department
  // Chatbot costs
  chatbot_message: 0.5, // Per message with someone's chatbot
  chatbot_info: 2.5, // Per info added (first 10)
  chatbot_info_extra: 20.0, // Per info added (after 10)
  chatbot_activate: 10.0, // Activation cost
} as const;

// Credit rewards
export const CREDIT_REWARDS = {
  signup: 15.0, // 10 + 5 welcome bonus
  identity_verification: 30.0,
  daily_claim: 5.0,
  referral_success: 30.0, // For each party (default, overridden by dynamic credit_costs)
} as const;

export type CreditActionType = keyof typeof CREDIT_COSTS;

export interface UserCredits {
  user_id: string;
  passive_credits: number;
  daily_credits: number;
  bonus_credits: number;
  purchased_credits: number;
  total_credits: number;
  max_daily_credits: number;
  daily_credits_reset_date: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  credit_type: 'passive' | 'daily' | 'bonus' | 'purchased';
  transaction_type: string;
  description: string | null;
  created_at: string;
}

// Standalone utility function to check if user has enough credits
export const checkSufficientCredits = async (userId: string, amount: number): Promise<boolean> => {
  const { data, error } = await supabase.rpc('check_sufficient_credits', {
    _user_id: userId,
    _amount: amount,
  });

  if (error) {
    console.error('Error checking credits:', error);
    return false;
  }

  return data as boolean;
};

// Standalone utility function to deduct credits
// Note: Animation is triggered via emitCreditDeduction - call separately if needed
export const deductCredits = async (
  userId: string,
  amount: number,
  transactionType: string,
  description?: string,
  showAnimation: boolean = true
): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.rpc('deduct_credits', {
    _user_id: userId,
    _amount: amount,
    _transaction_type: transactionType,
    _description: description || null,
  });

  if (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };
  
  // Emit animation event on successful deduction (only once)
  if (result.success && showAnimation) {
    emitCreditDeduction(amount, description);
  }

  // Invalidate credit queries to update UI immediately
  if (result.success) {
    invalidateCreditQueries(userId);
  }

  return result;
};

// Standalone utility function to add credits
export const addCreditsToUser = async (
  userId: string,
  amount: number,
  creditType: 'daily' | 'bonus' | 'purchased',
  transactionType: string,
  description?: string
): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.rpc('add_credits', {
    _user_id: userId,
    _amount: amount,
    _credit_type: creditType,
    _transaction_type: transactionType,
    _description: description || null,
  });

  if (error) {
    console.error('Error adding credits:', error);
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string };
};

export const useCredits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user credits balance
  const query = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async (): Promise<UserCredits | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_user_credit_balance', {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as unknown as UserCredits;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Fetch credit transactions history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['credit-transactions', user?.id],
    queryFn: async (): Promise<CreditTransaction[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Check if user has enough credits
  const hasEnoughCredits = (amount: number): boolean => {
    if (!query.data) return false;
    return query.data.total_credits >= amount;
  };

  // Check credits for a specific action
  const canPerformAction = (action: CreditActionType): boolean => {
    return hasEnoughCredits(CREDIT_COSTS[action]);
  };

  // Deduct credits mutation
  const deductCredits = useMutation({
    mutationFn: async ({ 
      amount, 
      transactionType, 
      description 
    }: { 
      amount: number; 
      transactionType: string; 
      description?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('deduct_credits', {
        _user_id: user.id,
        _amount: amount,
        _transaction_type: transactionType,
        _description: description || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Insufficient credits');
      }
      
      return { ...result, amount, description };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions', user?.id] });
      
      // Show subtle toast notification for credit deduction
      const actionDescription = data.description || 'Action';
      toast(`-${data.amount} crédit${data.amount > 1 ? 's' : ''}`, {
        description: actionDescription,
        duration: 2000,
        icon: '💰',
        position: 'bottom-center',
        className: 'text-sm',
      });
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient credits') {
        toast.error('Crédits insuffisants', {
          description: 'Achetez des crédits ou réclamez vos crédits quotidiens.',
          action: {
            label: 'Acheter',
            onClick: () => window.location.href = '/?tab=credits',
          },
        });
      }
    },
  });

  // Add credits mutation (for admin use)
  const addCredits = useMutation({
    mutationFn: async ({ 
      userId,
      amount, 
      creditType,
      transactionType, 
      description 
    }: { 
      userId: string;
      amount: number; 
      creditType: 'daily' | 'bonus' | 'purchased';
      transactionType: string; 
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('add_credits', {
        _user_id: userId,
        _amount: amount,
        _credit_type: creditType,
        _transaction_type: transactionType,
        _description: description || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
    },
  });

  // Perform action with credit deduction - returns object with success status and showDialog callback
  const performAction = async (
    action: CreditActionType,
    description?: string
  ): Promise<{ success: boolean; showDialog?: () => void }> => {
    const cost = CREDIT_COSTS[action];
    
    if (!hasEnoughCredits(cost)) {
      // Return a callback to show the dialog - caller should use useCreditDialog
      return { 
        success: false,
        showDialog: () => {
          // This will be handled by the caller using useCreditDialog
        }
      };
    }

    try {
      await deductCredits.mutateAsync({
        amount: cost,
        transactionType: action,
        description,
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  // Simple check that returns action cost if insufficient
  const checkCreditsForAction = (action: CreditActionType): { 
    hasEnough: boolean; 
    cost: number; 
    actionName: string;
  } => {
    const cost = CREDIT_COSTS[action];
    const actionNames: Record<CreditActionType, string> = {
      private_message_text: 'Envoyer un message',
      private_message_media: 'Envoyer un média',
      group_message_text: 'Message de groupe',
      group_message_media: 'Média de groupe',
      ephemeral_media: 'Média éphémère',
      album_share: 'Partager un album',
      album_create: 'Créer un album',
      profile_reaction: 'Réaction profil',
      profile_view: 'Voir un profil',
      nearby_unlock_30: 'Débloquer 30 profils',
      nearby_unlock_130: 'Débloquer 130 profils',
      swipe_like: 'Aimer un profil',
      swipe_dislike: 'Passer un profil',
      swipe_hide: 'Masquer définitivement',
      swipe_start_conversation: 'Démarrer une conversation',
      join_extra_group: 'Rejoindre un groupe',
      chatbot_message: 'Message chatbot',
      chatbot_info: 'Info chatbot',
      chatbot_info_extra: 'Info chatbot (extra)',
      chatbot_activate: 'Activer le chatbot',
    };
    return {
      hasEnough: hasEnoughCredits(cost),
      cost,
      actionName: actionNames[action] || action,
    };
  };

  return {
    credits: query.data,
    isLoading: query.isLoading,
    transactions,
    transactionsLoading,
    // Balances
    passiveCredits: query.data?.passive_credits || 0,
    dailyCredits: query.data?.daily_credits || 0,
    bonusCredits: query.data?.bonus_credits || 0,
    purchasedCredits: query.data?.purchased_credits || 0,
    totalCredits: query.data?.total_credits || 0,
    maxDailyCredits: query.data?.max_daily_credits || 5,
    // Checks
    hasEnoughCredits,
    canPerformAction,
    checkCreditsForAction,
    // Actions
    performAction,
    deductCredits,
    addCredits,
    // Refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
    },
  };
};

// Hook for checking if a profile has been viewed (to avoid double charge)
export const useProfileViewCheck = (viewedUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile-view-check', user?.id, viewedUserId],
    queryFn: async () => {
      if (!user?.id || !viewedUserId || user.id === viewedUserId) return true; // Own profile = free

      const { data, error } = await supabase
        .from('profile_view_credits')
        .select('id')
        .eq('viewer_user_id', user.id)
        .eq('viewed_user_id', viewedUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data; // True if already viewed (free), false if new view (needs credit)
    },
    enabled: !!user?.id && !!viewedUserId,
  });
};

// Hook for recording a profile view
export const useRecordProfileView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (viewedUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (user.id === viewedUserId) return; // Don't charge for viewing own profile

      const { error } = await supabase
        .from('profile_view_credits')
        .insert({
          viewer_user_id: user.id,
          viewed_user_id: viewedUserId,
          credits_spent: CREDIT_COSTS.profile_view,
        });

      // Ignore duplicate error (already viewed)
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: (_, viewedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['profile-view-check', user?.id, viewedUserId] });
    },
  });
};

// Hook to get nearby profile unlock status
export const useNearbyProfilesUnlock = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['nearby-unlock', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('nearby_profiles_unlock')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const unlockMutation = useMutation({
    mutationFn: async (unlockType: '30_extra' | '130_extra') => {
      if (!user?.id) throw new Error('Not authenticated');

      const cost = unlockType === '30_extra' ? CREDIT_COSTS.nearby_unlock_30 : CREDIT_COSTS.nearby_unlock_130;
      const duration = unlockType === '30_extra' ? 72 : 168; // hours
      
      // First deduct credits
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
        _user_id: user.id,
        _amount: cost,
        _transaction_type: unlockType === '30_extra' ? 'nearby_unlock_30' : 'nearby_unlock_130',
        _description: `Déblocage ${unlockType === '30_extra' ? '30' : '130'} profils supplémentaires`,
      });

      if (deductError) throw deductError;
      if (!(deductResult as any).success) {
        throw new Error((deductResult as any).error || 'Crédits insuffisants');
      }

      // Then create unlock record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);

      const { error: insertError } = await supabase
        .from('nearby_profiles_unlock')
        .insert({
          user_id: user.id,
          unlock_type: unlockType,
          credits_spent: cost,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nearby-unlock', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
      toast.success('Profils supplémentaires débloqués !');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors du déblocage');
    },
  });

  // Calculate max profiles visible
  const getMaxProfiles = () => {
    const baseLimit = 30;
    if (!query.data) return baseLimit;
    
    if (query.data.unlock_type === '130_extra') return 130;
    if (query.data.unlock_type === '30_extra') return 60;
    return baseLimit;
  };

  return {
    unlock: query.data,
    isLoading: query.isLoading,
    maxProfiles: getMaxProfiles(),
    unlockProfiles: unlockMutation.mutateAsync,
    isUnlocking: unlockMutation.isPending,
  };
};
