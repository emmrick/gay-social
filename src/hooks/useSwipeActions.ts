import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditCheck } from './useCreditCheck';
import { deductCredits } from './useCredits';
import { notifySwipeMatch } from '@/services/pushNotificationService';
import { toast } from 'sonner';
import { useMemo } from 'react';

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
  _photos?: string[];
}

interface MatchedProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
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
    staleTime: 0,
  });

  // Fetch active boosted user IDs
  const { data: boostedUserIds = [] } = useQuery({
    queryKey: ['boosted-user-ids'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('profile_boosts')
        .select('user_id')
        .gte('expires_at', new Date().toISOString())
        .lt('views_delivered', 3);
      if (error) throw error;
      return (data || []).map(b => b.user_id);
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Fetch swipeable profiles (excluding already swiped)
  const { data: rawProfiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ['swipeable-profiles', user?.id],
    queryFn: async (): Promise<SwipeableProfile[]> => {
      if (!user?.id) return [];

      const { data: currentActions, error: actionsError } = await supabase
        .from('swipe_actions')
        .select('*')
        .eq('user_id', user.id);
      if (actionsError) throw actionsError;

      const now = new Date();
      const excludedIds = (currentActions || [])
        .filter(action => {
          if (action.action_type === 'hide') return true;
          if (action.action_type === 'like') return true;
          if (action.action_type === 'dislike') {
            if (!action.expires_at) return true;
            return new Date(action.expires_at) > now;
          }
          return false;
        })
        .map(action => action.target_user_id);

      excludedIds.push(user.id);

      let query = supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, bio, age, is_online, last_seen, region, is_verified, looking_for, sexual_position, height, weight, body_type')
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false })
        .limit(50);

      if (excludedIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const profilesList = (data || []) as SwipeableProfile[];

      // Fetch profile photos for all profiles in one batch
      if (profilesList.length > 0) {
        const userIds = profilesList.map(p => p.user_id);
        const { data: allPhotos } = await supabase
          .from('profile_photos')
          .select('user_id, photo_url')
          .in('user_id', userIds)
          .order('display_order', { ascending: true });

        if (allPhotos) {
          const photosByUser = new Map<string, string[]>();
          allPhotos.forEach(photo => {
            const existing = photosByUser.get(photo.user_id) || [];
            existing.push(photo.photo_url);
            photosByUser.set(photo.user_id, existing);
          });

          profilesList.forEach(p => {
            const userPhotos = photosByUser.get(p.user_id);
            if (userPhotos && userPhotos.length > 0) {
              p._photos = userPhotos;
            }
          });
        }
      }

      return profilesList;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Inject boosted profiles at random positions
  const profiles = useMemo(() => {
    if (!rawProfiles.length || !boostedUserIds.length) return rawProfiles;
    
    const boostedProfiles = rawProfiles.filter(p => boostedUserIds.includes(p.user_id));
    const nonBoosted = rawProfiles.filter(p => !boostedUserIds.includes(p.user_id));
    
    if (!boostedProfiles.length) return rawProfiles;

    const result = [...nonBoosted];
    boostedProfiles.forEach(bp => {
      const pos = Math.min(Math.floor(Math.random() * 5), result.length);
      result.splice(pos, 0, { ...bp, _isBoosted: true } as any);
    });
    
    return result;
  }, [rawProfiles, boostedUserIds]);

  // Get profiles that user has liked
  const { data: likedProfiles = [], refetch: refetchLiked } = useQuery({
    queryKey: ['liked-profiles', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];
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
    staleTime: 0,
  });

  // Perform swipe action mutation
  const swipeMutation = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      actionType,
      onMatch,
    }: { 
      targetUserId: string; 
      actionType: SwipeActionType;
      onMatch?: (matchedProfile: MatchedProfile) => void;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const cost = SWIPE_CREDIT_COSTS[actionType];
      
      if (totalCredits < cost) {
        throw new Error('Crédits insuffisants');
      }

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

      const expiresAt = actionType === 'dislike' 
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null;

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

      // Check for mutual like (match!)
      if (actionType === 'like') {
        const { data: mutualLike } = await supabase
          .from('swipe_actions')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('target_user_id', user.id)
          .eq('action_type', 'like')
          .maybeSingle();

        if (mutualLike) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', targetUserId)
            .maybeSingle();

          // Trigger haptic for match
          try { navigator.vibrate?.([50, 30, 100]); } catch {}

          // Show match popup
          onMatch?.({
            user_id: targetUserId,
            username: targetProfile?.username || 'Quelqu\'un',
            avatar_url: targetProfile?.avatar_url || null,
          });

          // Notify both users
          notifySwipeMatch(user.id, targetProfile?.username || 'Quelqu\'un', targetUserId);
          notifySwipeMatch(targetUserId, myProfile?.username || 'Quelqu\'un', user.id);
        }
      }

      return { actionType, targetUserId };
    },
    onSuccess: async (data) => {
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

  const canStartConversation = (targetUserId: string): boolean => {
    return likedProfiles.includes(targetUserId);
  };

  const startConversationWithLike = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) return false;
    if (!canStartConversation(targetUserId)) {
      toast.error('Tu dois d\'abord aimer ce profil');
      return false;
    }
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
