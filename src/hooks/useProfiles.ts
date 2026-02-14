import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export const useProfilesByRegion = (region: string) => {
  return useQuery({
    queryKey: ['profiles', 'region', region],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('region', region)
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!region,
    staleTime: 30_000,
  });
};

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // If no avatar_url, fallback to primary photo from profile_photos
      if (!data.avatar_url) {
        const { data: primaryPhoto } = await supabase
          .from('profile_photos')
          .select('photo_url')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .maybeSingle();

        if (primaryPhoto?.photo_url) {
          return { ...data, avatar_url: primaryPhoto.photo_url };
        }
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
};
