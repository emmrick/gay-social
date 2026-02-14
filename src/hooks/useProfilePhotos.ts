import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback } from 'react';

interface ProfilePhoto {
  id: string;
  user_id: string;
  photo_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export const useProfilePhotos = (userId?: string) => {
  const { user, refetchProfile } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  // Fetch photos for a user
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['profile-photos', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('user_id', targetUserId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ProfilePhoto[];
    },
    enabled: !!targetUserId,
    staleTime: 60_000,
  });

  // Upload a new photo
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check current count
      const { count } = await supabase
        .from('profile_photos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((count || 0) >= 6) {
        throw new Error('Maximum 6 photos autorisées');
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Get current max order
      const { data: existing } = await supabase
        .from('profile_photos')
        .select('display_order')
        .eq('user_id', user.id)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;
      const isPrimary = nextOrder === 0;

      // Insert photo record
      const { error: insertError } = await supabase
        .from('profile_photos')
        .insert({
          user_id: user.id,
          photo_url: urlData.publicUrl,
          display_order: nextOrder,
          is_primary: isPrimary,
        });

      if (insertError) throw insertError;

      // If this is the first photo, also update avatar_url in profiles
      if (isPrimary) {
        await supabase
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl })
          .eq('user_id', user.id);
      }

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-photos', user?.id] });
      toast.success('Photo ajoutée !');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'upload');
    },
  });

  // Delete a photo
  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get photo info
      const { data: photo } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (!photo) throw new Error('Photo not found');

      // Delete from database
      const { error } = await supabase
        .from('profile_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      // If this was primary, set a new primary
      if (photo.is_primary) {
        const { data: remaining } = await supabase
          .from('profile_photos')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true })
          .limit(1);

        if (remaining && remaining.length > 0) {
          await supabase
            .from('profile_photos')
            .update({ is_primary: true })
            .eq('id', remaining[0].id);

          // Update avatar_url
          await supabase
            .from('profiles')
            .update({ avatar_url: remaining[0].photo_url })
            .eq('user_id', user.id);
        } else {
          // No photos left, clear avatar
          await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('user_id', user.id);
        }
      }

      return photoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-photos', user?.id] });
      toast.success('Photo supprimée');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  // Set a photo as primary
  const setPrimaryPhoto = useMutation({
    mutationFn: async (photoId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get photo info
      const { data: photo } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (!photo) throw new Error('Photo not found');

      // Unset current primary
      await supabase
        .from('profile_photos')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true);

      // Set new primary
      await supabase
        .from('profile_photos')
        .update({ is_primary: true })
        .eq('id', photoId);

      // Update avatar_url
      await supabase
        .from('profiles')
        .update({ avatar_url: photo.photo_url })
        .eq('user_id', user.id);

      return photoId;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['profile-photos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Refresh the auth context profile to update avatar everywhere
      await refetchProfile();
      toast.success('Photo de profil mise à jour !');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur');
    },
  });

  // Reorder photos
  const reorderPhotos = useMutation({
    mutationFn: async (photoIds: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Update each photo's order
      await Promise.all(
        photoIds.map((id, index) =>
          supabase
            .from('profile_photos')
            .update({ display_order: index })
            .eq('id', id)
        )
      );

      return photoIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-photos', user?.id] });
    },
  });

  return {
    photos,
    isLoading,
    uploadPhoto,
    deletePhoto,
    setPrimaryPhoto,
    reorderPhotos,
    canAddMore: photos.length < 6,
  };
};
