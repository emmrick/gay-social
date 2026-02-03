import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserUsage } from './useUserUsage';
import { toast } from 'sonner';
import { CREDIT_COSTS, deductCredits, checkSufficientCredits, useCredits } from '@/hooks/useCredits';
import { useCreditDialog } from '@/contexts/CreditDialogContext';

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
  const { limits } = useUserUsage();
  const { totalCredits, hasEnoughCredits } = useCredits();
  const { showInsufficientCreditsDialog } = useCreditDialog();

  // Check if user has enough credits for ephemeral media
  const canSend = hasEnoughCredits(CREDIT_COSTS.ephemeral_media);
  const creditsNeeded = CREDIT_COSTS.ephemeral_media;

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

      // Credits are the only limiting factor now - no more premium/usage limits

      // Check if user has enough credits for ephemeral media
      const hasCredits = await checkSufficientCredits(user.id, CREDIT_COSTS.ephemeral_media);
      if (!hasCredits) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      // Check file size limits
      const maxSize = messageType === 'video' ? limits.maxVideoSize : limits.maxPhotoSize;
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        throw new Error(`FILE_TOO_LARGE:${maxSizeMB}`);
      }

      setIsUploading(true);
      setProgress(10);

      try {
        // Deduct credits for ephemeral media
        const deductResult = await deductCredits(
          user.id,
          CREDIT_COSTS.ephemeral_media,
          'ephemeral_media',
          `Média éphémère ${messageType === 'image' ? 'photo' : 'vidéo'}`
        );

        if (!deductResult.success) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
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
        setProgress(95);

        // No longer tracking usage counts - credits are the only limit
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
      // Invalidate relevant queries to refresh the conversation
      if (variables.isPrivate && variables.recipientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['private-messages', user?.id, variables.recipientId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['private-conversations', user?.id] 
        });
      } else if (variables.chatRoomId) {
        queryClient.invalidateQueries({ 
          queryKey: ['messages', variables.chatRoomId] 
        });
      }
    },
    onError: (error: Error) => {
      if (error.message === 'INSUFFICIENT_CREDITS') {
        toast.error('Crédits insuffisants pour envoyer ce média');
      } else if (error.message.startsWith('FILE_TOO_LARGE:')) {
        const maxSize = error.message.split(':')[1];
        toast.error(`Fichier trop volumineux. Maximum: ${maxSize} MB`);
      } else {
        toast.error('Erreur lors de l\'envoi du média');
      }
    },
  });

  return {
    uploadEphemeralMedia,
    isUploading,
    progress,
    canSend,
    creditsNeeded,
    totalCredits,
    showInsufficientCreditsDialog: () => showInsufficientCreditsDialog(creditsNeeded, 'Média éphémère'),
  };
};
