import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OwnPrivateProfile {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
}

/**
 * Fetch the current user's private profile fields (revoked at column-grant level
 * from authenticated role) via a SECURITY DEFINER RPC.
 */
export const useOwnPrivateProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['own-private-profile', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<OwnPrivateProfile | null> => {
      const { data, error } = await supabase.rpc('get_my_private_profile');
      if (error) {
        console.error('[useOwnPrivateProfile]', error);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return (row as OwnPrivateProfile) ?? null;
    },
  });
};
