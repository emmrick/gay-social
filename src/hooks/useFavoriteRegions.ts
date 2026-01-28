import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFavoriteRegions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorite-regions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('favorite_regions')
        .select('region_code')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(f => f.region_code);
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (regionCode: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('favorite_regions')
        .insert({ user_id: user.id, region_code: regionCode });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-regions'] });
      toast.success('Région ajoutée aux favoris');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout aux favoris');
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (regionCode: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('favorite_regions')
        .delete()
        .eq('user_id', user.id)
        .eq('region_code', regionCode);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-regions'] });
      toast.success('Région retirée des favoris');
    },
    onError: () => {
      toast.error('Erreur lors du retrait des favoris');
    },
  });

  const toggleFavorite = (regionCode: string) => {
    if (favorites.includes(regionCode)) {
      removeFavorite.mutate(regionCode);
    } else {
      addFavorite.mutate(regionCode);
    }
  };

  const isFavorite = (regionCode: string) => favorites.includes(regionCode);

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
};
