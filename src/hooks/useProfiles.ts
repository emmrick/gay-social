import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { withTimeout } from '@/lib/withTimeout';

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
  });
};

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await withTimeout(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
        ),
        12000
      );

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    retry: 0,
  });
};
