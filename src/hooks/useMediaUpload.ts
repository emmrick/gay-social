import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for uploading media to the private 'media' bucket.
 * Returns the file path (not URL) which should be stored in the database.
 * Use useSignedMediaUrl hook to get a signed URL for displaying the media.
 */
export const useMediaUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  /**
   * Upload a file to the media bucket.
   * @returns The file path (e.g., "userId/filename.jpg") to store in the database,
   *          or null if upload fails.
   */
  const uploadMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;

    setIsUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setProgress(100);
      // Return the file path, NOT the public URL
      // The consuming component should use useSignedMediaUrl to get a signed URL
      return filePath;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMedia = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('media')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return {
    uploadMedia,
    deleteMedia,
    isUploading,
    progress,
  };
};
