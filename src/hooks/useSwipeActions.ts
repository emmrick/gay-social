import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditCheck } from './useCreditCheck';
import { deductCredits } from './useCredits';
import { toast } from 'sonner';

// Credit costs for swipe actions
export const SWIPE_CREDIT_COSTS = {
  like: 0.5,
  dislike: 0.2,
  hide: 0.1,
  start_conversation: 0.2,
} as const;

export type SwipeActionType = 'like' | 'dislike' | 'hide';

interface SwipeAction {
  id: string;
  user_id: string;
  target_user_id: string;
  action_type: SwipeActionType;
  credits_spent: number;
  created_at: string;
  expires_at: string | null;
}

interface SwipeableProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  is_online: boolean | null;
  last_seen: string | null;
  region: string;
  is_verified: boolean;
  looking_for: string[] | null;
  sexual_position: string | null;
  height: number | null;
  weight: number | null;
  body_type: string | null;
}

export const useSwipeActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { checkCreditsAmount, totalCredits } = useCreditCheck();

  // Fetch user's swipe actions to filter profiles
  const { data: swipeActions = [], isLoading: actionsLoading, refetch: refetchActions } = useQuery({
    queryKey: ['swipe-actions', user?.id],
    queryFn: async (): Promise<SwipeAction[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('swipe_actions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as SwipeAction[];
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch
  });

  // Fetch swipeable profiles (excluding already swiped)
  const { data: profiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ['swipeable-profiles', user?.id],
    queryFn: async (): Promise<SwipeableProfile[]> => {
      if (!user?.id) return [];

      // First fetch current swipe actions directly
      const { data: currentActions, error: actionsError } = await supabase
        .from('swipe_actions')
        .select('*')
        .eq('user_id', user.id);
      
      if (actionsError) throw actionsError;

      // Get IDs of profiles to exclude
      const now = new Date();
      const excludedIds = (currentActions || [])
        .filter(action => {
          // Always exclude 'hide' actions
          if (action.action_type === 'hide') return true;
          // Always exclude 'like' actions
          if (action.action_type === 'like') return true;
          // For 'dislike', only exclude if not expired (3 months)
          if (action.action_type === 'dislike') {
            if (!action.expires_at) return true;
            return new Date(action.expires_at) > now;
          }
          return false;
        })
        .map(action => action.target_user_id);

      // Add current user to excluded list
      excludedIds.push(user.id);

      // Fetch profiles
      let query = supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, bio, age, is_online, last_seen, region, is_verified, looking_for, sexual_position, height, weight, body_type')
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false })
        .limit(50);

      // Exclude already swiped profiles
      if (excludedIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as SwipeableProfile[];
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch to get fresh data
  });

  // Get profiles that user has liked - fetch directly from DB to ensure freshness
  const { data: likedProfiles = [], refetch: refetchLiked } = useQuery({
    queryKey: ['liked-profiles', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];

      // Fetch likes directly from database, sorted by most recent first
      const { data, error } = await supabase
        .from('swipe_actions')
        .select('target_user_id, created_at')
        .eq('user_id', user.id)
        .eq('action_type', 'like')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(action => action.target_user_id);
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch
  });

  // Perform swipe action mutation
  const swipeMutation = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      actionType 
    }: { 
      targetUserId: string; 
      actionType: SwipeActionType;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const cost = SWIPE_CREDIT_COSTS[actionType];
      
      // Check credits first
      if (totalCredits < cost) {
        throw new Error('Crédits insuffisants');
      }

      // Deduct credits
      const deductResult = await deductCredits(
        user.id,
        cost,
        `swipe_${actionType}`,
        actionType === 'like' 
          ? 'J\'aime un profil' 
          : actionType === 'dislike' 
            ? 'Passer un profil' 
            : 'Masquer définitivement'
      );

      if (!deductResult.success) {
        throw new Error(deductResult.error || 'Erreur lors de la déduction des crédits');
      }

      // Calculate expiration for dislike (3 months)
      const expiresAt = actionType === 'dislike' 
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Record swipe action
      const { error } = await supabase
        .from('swipe_actions')
        .upsert({
          user_id: user.id,
          target_user_id: targetUserId,
          action_type: actionType,
          credits_spent: cost,
          expires_at: expiresAt,
        }, {
          onConflict: 'user_id,target_user_id,action_type',
        });

      if (error) throw error;

      return { actionType, targetUserId };
    },
    onSuccess: async (data) => {
      // Immediately invalidate and refetch to ensure UI is up to date
      await queryClient.invalidateQueries({ queryKey: ['liked-profiles', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['swipe-actions', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['swipeable-profiles', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });

      if (data.actionType === 'like') {
        toast.success('Profil aimé ! 💖', {
          description: 'Tu peux maintenant lui envoyer un message.',
        });
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('insuffisants')) {
        toast.error('Crédits insuffisants', {
          description: 'Achetez des crédits pour continuer.',
        });
      } else {
        toast.error('Erreur', {
          description: error.message,
        });
      }
    },
  });

  // Check if user can start conversation with liked profile
  const canStartConversation = (targetUserId: string): boolean => {
    return likedProfiles.includes(targetUserId);
  };

  // Start conversation with liked profile (costs additional credits)
  const startConversationWithLike = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    // Check if already liked
    if (!canStartConversation(targetUserId)) {
      toast.error('Tu dois d\'abord aimer ce profil');
      return false;
    }

    // Conversation start cost is handled by the messaging system
    return true;
  };

  return {
    profiles,
    likedProfiles,
    isLoading: actionsLoading || profilesLoading,
    swipe: swipeMutation.mutate,
    swipeAsync: swipeMutation.mutateAsync,
    isSwaping: swipeMutation.isPending,
    canStartConversation,
    startConversationWithLike,
    refetchProfiles,
    creditCosts: SWIPE_CREDIT_COSTS,
  };
};
