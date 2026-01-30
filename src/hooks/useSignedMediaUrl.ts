import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get a signed URL for media stored in the private 'media' bucket.
 * The mediaPath should be the file path stored in the database (e.g., "userId/filename.jpg")
 * 
 * @param mediaPath - The file path in the media bucket
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 */
export const useSignedMediaUrl = (mediaPath: string | null, expiresIn: number = 3600) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!mediaPath || !user) {
      setSignedUrl(null);
      return;
    }

    // Check if this is already a full URL (legacy data) vs a file path
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      // Legacy: already a full URL, use as-is (this handles old data before the migration)
      setSignedUrl(mediaPath);
      return;
    }

    let isCancelled = false;

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: signedUrlError } = await supabase.storage
          .from('media')
          .createSignedUrl(mediaPath, expiresIn);

        if (isCancelled) return;

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
          setError(signedUrlError.message);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Error fetching signed URL:', err);
        setError('Failed to load media');
        setSignedUrl(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrl();

    return () => {
      isCancelled = true;
    };
  }, [mediaPath, expiresIn, user]);

  return { signedUrl, isLoading, error };
};
