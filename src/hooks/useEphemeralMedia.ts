import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type EphemeralMedia = Tables<'ephemeral_media'>;

interface EphemeralMediaWithUrl extends EphemeralMedia {
  signedUrl: string;
}

export const useEphemeralMedia = (messageId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ephemeral-media', messageId],
    queryFn: async (): Promise<EphemeralMediaWithUrl | null> => {
      if (!messageId) return null;

      const { data, error } = await supabase
        .from('ephemeral_media')
        .select('*')
        .eq('message_id', messageId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get signed URL for the media
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('media')
        .createSignedUrl(data.media_url, 3600);

      if (signedUrlError) {
        console.error('Error getting signed URL:', signedUrlError);
        return null;
      }

      return {
        ...data,
        signedUrl: signedUrlData.signedUrl,
      };
    },
    enabled: !!messageId && !!user,
  });

  // Mark media as viewed
  const markAsViewed = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await supabase
        .from('ephemeral_media')
        .update({
          is_viewed: true,
          viewed_at: new Date().toISOString(),
        })
        .eq('id', mediaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ephemeral-media', messageId] });
    },
  });

  return {
    media: query.data,
    isLoading: query.isLoading,
    markAsViewed,
  };
};
