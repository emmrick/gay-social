import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCreateNotification } from '@/hooks/useNotifications';
import { CREDIT_COSTS, deductCredits, checkSufficientCredits } from '@/hooks/useCredits';

interface Album {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

interface AlbumMedia {
  id: string;
  album_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
}

interface AlbumShare {
  id: string;
  album_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const useAlbums = (userId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();
  const targetUserId = userId || user?.id;
  const isOwnAlbums = targetUserId === user?.id;

  // Fetch user's albums
  const { data: albums = [], isLoading: albumsLoading } = useQuery({
    queryKey: ['albums', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('user_albums')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Album[];
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch albums shared with current user
  const { data: sharedAlbums = [], isLoading: sharedLoading } = useQuery({
    queryKey: ['shared-albums', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: shares, error: sharesError } = await supabase
        .from('album_shares')
        .select('*, album:user_albums(*)')
        .eq('shared_with_user_id', user.id)
        .eq('is_active', true);

      if (sharesError) throw sharesError;

      // Filter out expired shares
      const activeShares = (shares || []).filter(share => {
        if (!share.expires_at) return true;
        return new Date(share.expires_at) > new Date();
      });

      return activeShares.map(share => ({
        ...share.album,
        share: {
          id: share.id,
          expires_at: share.expires_at,
          shared_by_user_id: share.shared_by_user_id,
        }
      }));
    },
    enabled: !!user?.id,
  });

  // Create album
  const createAlbum = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if this is the first album (free) or subsequent (costs credits)
      const currentAlbumCount = albums.length;
      const isFirstAlbum = currentAlbumCount === 0;

      if (!isFirstAlbum) {
        // Check if user has enough credits for additional album
        const hasCredits = await checkSufficientCredits(user.id, CREDIT_COSTS.album_create);
        if (!hasCredits) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        // Deduct credits for additional album
        const deductResult = await deductCredits(
          user.id,
          CREDIT_COSTS.album_create,
          'album_create',
          `Création d'un nouvel album: ${name}`
        );

        if (!deductResult.success) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
      }

      const { data, error } = await supabase
        .from('user_albums')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          is_private: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', user?.id] });
      toast.success('Album créé !');
    },
    onError: (error: Error) => {
      if (error.message === 'INSUFFICIENT_CREDITS') {
        toast.error('Crédits insuffisants pour créer un album');
      } else {
        toast.error(error.message || 'Erreur lors de la création');
      }
    },
  });

  // Delete album
  const deleteAlbum = useMutation({
    mutationFn: async (albumId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_albums')
        .delete()
        .eq('id', albumId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', user?.id] });
      toast.success('Album supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  // Add media to album with progress callback
  const addMediaWithProgress = async (
    albumId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ) => {
    if (!user?.id) throw new Error('Not authenticated');

    // Upload to storage with progress simulation (Supabase doesn't expose upload progress)
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${albumId}/${Date.now()}.${fileExt}`;

    // Simulate progress for better UX
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 15, 85);
      onProgress?.(Math.round(progress));
    }, 200);

    try {
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;

      onProgress?.(90);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Insert media record
      const { data, error } = await supabase
        .from('album_media')
        .insert({
          album_id: albumId,
          media_url: urlData.publicUrl,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
        })
        .select()
        .single();

      if (error) throw error;
      
      onProgress?.(100);
      queryClient.invalidateQueries({ queryKey: ['album-media', albumId] });
      
      return data;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  // Legacy mutation for backward compatibility
  const addMedia = useMutation({
    mutationFn: async ({ albumId, file }: { albumId: string; file: File }) => {
      return addMediaWithProgress(albumId, file);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-media', variables.albumId] });
      toast.success('Média ajouté !');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'upload');
    },
  });

  // Remove media from album
  const removeMedia = useMutation({
    mutationFn: async ({ albumId, mediaId }: { albumId: string; mediaId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // First get the media URL to delete from storage
      const { data: mediaData, error: fetchError } = await supabase
        .from('album_media')
        .select('media_url')
        .eq('id', mediaId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('album_media')
        .delete()
        .eq('id', mediaId);

      if (deleteError) throw deleteError;

      // Try to delete from storage (extract path from URL)
      try {
        const url = new URL(mediaData.media_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('media').remove([pathMatch[1]]);
        }
      } catch (e) {
        console.warn('Could not delete file from storage:', e);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-media', variables.albumId] });
      toast.success('Média supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const useAlbumMedia = (albumId: string) => {
    return useQuery({
      queryKey: ['album-media', albumId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('album_media')
          .select('*')
          .eq('album_id', albumId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const items = data as AlbumMedia[];
        
        if (items.length === 0) return items;

        // Batch generate signed URLs for all media at once
        const paths = items.map(item => {
          let cleanPath = item.media_url;
          if (cleanPath.includes('/storage/v1/object/')) {
            const match = cleanPath.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/media\/(.+?)(\?|$)/);
            if (match) cleanPath = match[1];
          }
          return cleanPath;
        });

        const { data: signedData, error: signError } = await supabase.storage
          .from('media')
          .createSignedUrls(paths, 3600);

        if (signError || !signedData) {
          console.error('Batch signed URL error:', signError);
          return items;
        }

        return items.map((item, i) => ({
          ...item,
          media_url: signedData[i]?.signedUrl || item.media_url,
        }));
      },
      enabled: !!albumId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Share album with user
  const shareAlbum = useMutation({
    mutationFn: async ({ 
      albumId, 
      sharedWithUserId, 
      duration 
    }: { 
      albumId: string; 
      sharedWithUserId: string; 
      duration?: 'unlimited' | '24h' | '7d' | '30d';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if user has enough credits for album share
      const hasCredits = await checkSufficientCredits(user.id, CREDIT_COSTS.album_share);
      if (!hasCredits) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      // Deduct credits for sharing album
      const deductResult = await deductCredits(
        user.id,
        CREDIT_COSTS.album_share,
        'album_share',
        'Partage d\'album'
      );

      if (!deductResult.success) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      let expiresAt: string | null = null;
      if (duration && duration !== 'unlimited') {
        const now = new Date();
        switch (duration) {
          case '24h':
            now.setHours(now.getHours() + 24);
            break;
          case '7d':
            now.setDate(now.getDate() + 7);
            break;
          case '30d':
            now.setDate(now.getDate() + 30);
            break;
        }
        expiresAt = now.toISOString();
      }

      // Create the album share record
      const { data: shareData, error: shareError } = await supabase
        .from('album_shares')
        .insert({
          album_id: albumId,
          shared_with_user_id: sharedWithUserId,
          shared_by_user_id: user.id,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (shareError) throw shareError;

      // Get album info for the message
      const album = albums.find(a => a.id === albumId);
      
      // Create the message content with the share info
      const messageContent = JSON.stringify({
        shareId: shareData.id,
        albumId: albumId,
        albumName: album?.name || 'Album',
        expiresAt: expiresAt,
      });

      // Insert the message - IMPORTANT: This creates the message in the conversation
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: sharedWithUserId,
          content: messageContent,
          message_type: 'album_share',
          is_private: true,
          chat_room_id: null, // Must be null for private messages
        });

      if (msgError) {
        console.error('Failed to create album share message:', msgError);
        // Throw the error so the user knows the message wasn't created
        throw new Error('Album partagé mais le message n\'a pas pu être envoyé: ' + msgError.message);
      }

      // Get sender's profile for notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      return { shareData, albumName: album?.name, senderUsername: senderProfile?.username };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-shares'] });
      // Invalidate with proper keys to refresh the conversation
      queryClient.invalidateQueries({ queryKey: ['private-messages', user?.id, variables.sharedWithUserId] });
      queryClient.invalidateQueries({ queryKey: ['private-conversations', user?.id] });
      
      // Create notification for recipient
      createNotification.mutate({
        userId: variables.sharedWithUserId,
        type: 'album_share',
        title: '📁 Nouvel album partagé',
        message: `${result?.senderUsername || 'Quelqu\'un'} a partagé l'album "${result?.albumName || 'Album'}" avec toi`,
        actionUrl: `/messages`,
      });
      
      toast.success('Album partagé !');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors du partage');
    },
  });

  // Stop sharing album
  const stopSharing = useMutation({
    mutationFn: async (shareId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('album_shares')
        .update({ is_active: false })
        .eq('id', shareId)
        .eq('shared_by_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album-shares'] });
      toast.success('Partage arrêté');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur');
    },
  });

  // Get shares for an album
  const useAlbumShares = (albumId: string) => {
    return useQuery({
      queryKey: ['album-shares', albumId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('album_shares')
          .select('*')
          .eq('album_id', albumId)
          .eq('is_active', true);

        if (error) throw error;
        return data as AlbumShare[];
      },
      enabled: !!albumId && !!user?.id,
    });
  };

  return {
    albums,
    sharedAlbums,
    isLoading: albumsLoading || sharedLoading,
    isOwnAlbums,
    createAlbum,
    deleteAlbum,
    addMedia,
    addMediaWithProgress,
    removeMedia,
    shareAlbum,
    stopSharing,
    useAlbumMedia,
    useAlbumShares,
  };
};
