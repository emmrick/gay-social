import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UploadEphemeralMediaParams {
  file: File;
  messageType: 'image' | 'video';
  viewDuration: number;
  chatRoomId?: string;
  recipientId?: string;
  isPrivate: boolean;
}

export const useEphemeralMediaUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const uploadEphemeralMedia = useMutation({
    mutationFn: async ({
      file,
      messageType,
      viewDuration,
      chatRoomId,
      recipientId,
      isPrivate,
    }: UploadEphemeralMediaParams) => {
      if (!user) throw new Error('Not authenticated');

      setIsUploading(true);
      setProgress(10);

      try {
        // 1. Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        setProgress(50);

        // 2. Get signed URL (private bucket)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('media')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (signedUrlError) throw signedUrlError;
        const mediaUrl = signedUrlData.signedUrl;
        setProgress(70);

        // 3. Create message
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            chat_room_id: isPrivate ? null : chatRoomId,
            recipient_id: isPrivate ? recipientId : null,
            content: filePath, // Store file path for later access
            message_type: messageType,
            is_private: isPrivate,
          })
          .select()
          .single();

        if (messageError) throw messageError;
        setProgress(85);

        // 4. Create ephemeral media record
        const { data: ephemeralMedia, error: ephemeralError } = await supabase
          .from('ephemeral_media')
          .insert({
            message_id: message.id,
            media_type: messageType,
            media_url: filePath,
            view_duration: viewDuration,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
          })
          .select()
          .single();

        if (ephemeralError) throw ephemeralError;
        setProgress(100);

        return {
          message,
          ephemeralMedia,
          signedUrl: mediaUrl,
        };
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      if (variables.isPrivate && variables.recipientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['private-messages', user?.id, variables.recipientId] 
        });
      } else if (variables.chatRoomId) {
        queryClient.invalidateQueries({ 
          queryKey: ['messages', variables.chatRoomId] 
        });
      }
    },
  });

  return {
    uploadEphemeralMedia,
    isUploading,
    progress,
  };
};
