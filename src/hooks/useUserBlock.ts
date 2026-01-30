import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// Check if current user has blocked another user
export const useHasBlockedUser = (blockedUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-block', user?.id, blockedUserId],
    queryFn: async () => {
      if (!user?.id || !blockedUserId) return false;

      const { data, error } = await supabase
        .from('user_personal_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking block status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id && !!blockedUserId,
  });
};

// Check if current user is blocked by another user
export const useIsBlockedByUser = (otherUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['blocked-by-user', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return false;

      const { data, error } = await supabase
        .from('user_personal_blocks')
        .select('id')
        .eq('blocker_id', otherUserId)
        .eq('blocked_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking if blocked by user:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id && !!otherUserId,
  });
};

// Block a user
export const useBlockUserAction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_personal_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId,
        });

      if (error) throw error;
    },
    onSuccess: (_, blockedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-block', user?.id, blockedUserId] });
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      toast.success('Utilisateur bloqué');
    },
    onError: (error) => {
      console.error('Error blocking user:', error);
      toast.error('Erreur lors du blocage');
    },
  });
};

// Unblock a user
export const useUnblockUserAction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_personal_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;
    },
    onSuccess: (_, blockedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-block', user?.id, blockedUserId] });
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      toast.success('Utilisateur débloqué');
    },
    onError: (error) => {
      console.error('Error unblocking user:', error);
      toast.error('Erreur lors du déblocage');
    },
  });
};

// Get all blocked users by current user
export const useBlockedUsers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_personal_blocks')
        .select(`
          id,
          blocked_id,
          created_at
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blocked users:', error);
        return [];
      }

      // Fetch profiles for blocked users
      const blockedIds = data.map(b => b.blocked_id);
      if (blockedIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', blockedIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(block => ({
        ...block,
        profile: profileMap.get(block.blocked_id),
      }));
    },
    enabled: !!user?.id,
  });
};
