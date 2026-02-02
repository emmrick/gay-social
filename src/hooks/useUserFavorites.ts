import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyNewFavorite } from '@/services/pushNotificationService';

interface FavoriteUser {
  id: string;
  user_id: string;
  favorite_user_id: string;
  created_at: string;
  profile?: {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    is_online: boolean | null;
    last_seen: string | null;
    region: string;
  };
}

export const useUserFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-favorites', user?.id],
    queryFn: async (): Promise<FavoriteUser[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          user_id,
          favorite_user_id,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each favorite
      if (data && data.length > 0) {
        const favoriteUserIds = data.map(f => f.favorite_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, username, avatar_url, bio, age, is_online, last_seen, region')
          .in('user_id', favoriteUserIds);

        if (profilesError) throw profilesError;

        // Merge profiles into favorites
        return data.map(fav => ({
          ...fav,
          profile: profiles?.find(p => p.user_id === fav.favorite_user_id),
        }));
      }

      return data || [];
    },
    enabled: !!user,
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000,
  });

  const addFavorite = useMutation({
    mutationFn: async (favoriteUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          favorite_user_id: favoriteUserId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Déjà en favoris');
        }
        throw error;
      }

      // Send push notification to the favorited user
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      if (myProfile?.username) {
        notifyNewFavorite(favoriteUserId, myProfile.username, user.id);
      }

      // Also create in-app notification
      await supabase.from('notifications').insert({
        user_id: favoriteUserId,
        type: 'new_favorite',
        title: '⭐ Nouveau favori !',
        message: `${myProfile?.username || 'Quelqu\'un'} t'a ajouté en favori`,
        action_url: `/profile/${user.id}`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
      toast.success('Ajouté aux favoris');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (favoriteUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('favorite_user_id', favoriteUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
      toast.success('Retiré des favoris');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const isFavorite = (userId: string) => {
    return query.data?.some(f => f.favorite_user_id === userId) || false;
  };

  const toggleFavorite = async (userId: string) => {
    if (isFavorite(userId)) {
      await removeFavorite.mutateAsync(userId);
    } else {
      await addFavorite.mutateAsync(userId);
    }
  };

  return {
    ...query,
    favorites: query.data || [],
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    isToggling: addFavorite.isPending || removeFavorite.isPending,
  };
};

export default useUserFavorites;
