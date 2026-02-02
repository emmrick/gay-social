import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { notifyNewReaction } from '@/services/pushNotificationService';

interface ProfileReaction {
  id: string;
  profile_user_id: string;
  reactor_user_id: string;
  emoji: string;
  created_at: string;
}

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const useProfileReactions = (profileUserId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile-reactions', profileUserId],
    queryFn: async (): Promise<ReactionCount[]> => {
      if (!profileUserId) return [];

      const { data, error } = await supabase
        .from('profile_reactions' as any)
        .select('emoji, reactor_user_id')
        .eq('profile_user_id', profileUserId);

      if (error) {
        console.error('Error fetching profile reactions:', error);
        return [];
      }

      if (!data) return [];

      // Group reactions by emoji
      const reactionMap = new Map<string, { count: number; hasReacted: boolean }>();
      
      (data as any[]).forEach((reaction) => {
        const current = reactionMap.get(reaction.emoji) || { count: 0, hasReacted: false };
        current.count++;
        if (reaction.reactor_user_id === user?.id) {
          current.hasReacted = true;
        }
        reactionMap.set(reaction.emoji, current);
      });

      return Array.from(reactionMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        hasReacted: data.hasReacted,
      }));
    },
    enabled: !!profileUserId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!profileUserId) return;

    const channel = supabase
      .channel(`profile-reactions-${profileUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_reactions',
          filter: `profile_user_id=eq.${profileUserId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['profile-reactions', profileUserId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileUserId, queryClient]);

  return query;
};

export const useToggleProfileReaction = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileUserId, emoji }: { profileUserId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('profile_reactions' as any)
        .select('id')
        .eq('profile_user_id', profileUserId)
        .eq('reactor_user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('profile_reactions' as any)
          .delete()
          .eq('id', (existing as any).id);
        
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add reaction
        const { error } = await supabase
          .from('profile_reactions' as any)
          .insert({
            profile_user_id: profileUserId,
            reactor_user_id: user.id,
            emoji,
          } as any);
        
        if (error) throw error;

        // Send notification to profile owner (only if not reacting to own profile)
        if (profileUserId !== user.id) {
          // Send push notification
          notifyNewReaction(profileUserId, profile?.username || 'Quelqu\'un', user.id, emoji);

          // Also create in-app notification
          await supabase
            .from('notifications')
            .insert({
              user_id: profileUserId,
              type: 'profile_reaction',
              title: `${emoji} Nouvelle réaction !`,
              message: `${profile?.username || 'Quelqu\'un'} a réagi à ton profil avec ${emoji}`,
              action_url: `/profile/${user.id}`,
            });
        }

        return { action: 'added' };
      }
    },
    onSuccess: (_, { profileUserId }) => {
      queryClient.invalidateQueries({ queryKey: ['profile-reactions', profileUserId] });
    },
  });
};

// Available reaction emojis for profiles
export const PROFILE_REACTION_EMOJIS = ['🔥', '😍', '👋', '💪', '🐻', '🦊'];
