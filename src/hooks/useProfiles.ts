import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';

type Profile = Tables<'profiles'>;

/** Resolve avatar_url to a signed URL for a single profile */
async function resolveProfileAvatar<T extends { avatar_url?: string | null }>(profile: T): Promise<T> {
  if (!profile.avatar_url) return profile;
  const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
  return { ...profile, avatar_url: signedUrl };
}

/** Resolve avatar_url for an array of profiles */
async function resolveProfileAvatars<T extends { avatar_url?: string | null }>(profiles: T[]): Promise<T[]> {
  return Promise.all(profiles.map(resolveProfileAvatar));
}

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
      if (!data) return [];

      // Filter out suspended/banned users
      const checks = await Promise.all(
        data.map(p => supabase.rpc('is_user_suspended_or_blocked', { _user_id: p.user_id }))
      );
      const filtered = data.filter((_, i) => checks[i].data !== true);
      return resolveProfileAvatars(filtered);
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
          return resolveProfileAvatar({ ...data, avatar_url: primaryPhoto.photo_url });
        }
      }

      return resolveProfileAvatar(data);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
};
