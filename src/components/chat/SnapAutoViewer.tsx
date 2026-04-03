import { useState, useCallback, useMemo } from 'react';
import { useEphemeralMedia } from '@/hooks/useEphemeralMedia';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifyEphemeralScreenshot } from '@/services/pushNotificationService';
import { notifyScreenshotInChat } from '@/services/screenshotNotificationService';
import EphemeralMediaViewer from './EphemeralMediaViewer';

interface SnapAutoViewerProps {
  messageId: string;
  senderName: string;
  onClose: () => void;
}

/**
 * Auto-opened ephemeral viewer when entering a conversation with a pending snap.
 * Handles viewing, marking as viewed, and screenshot detection.
 */
const SnapAutoViewer = ({ messageId, senderName, onClose }: SnapAutoViewerProps) => {
  const { media, isLoading, markAsViewed } = useEphemeralMedia(messageId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isUnlimited = media?.view_duration === 0;

  const handleViewed = useCallback(async () => {
    if (media && !isUnlimited) {
      await markAsViewed.mutateAsync(media.id);
      queryClient.invalidateQueries({ queryKey: ['pending-ephemeral-snaps'] });
    }
  }, [media, markAsViewed, isUnlimited, queryClient]);

  const handleScreenshotDetected = useCallback(async () => {
    if (!media || !user) return;
    try {
      await supabase
        .from('ephemeral_media')
        .update({
          screenshot_detected: true,
          screenshot_detected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', media.id);

      const { data: msg } = await supabase
        .from('messages').select('sender_id').eq('id', messageId).single();
      if (msg?.sender_id) {
        const { data: profile } = await supabase
          .from('profiles').select('username').eq('user_id', user.id).single();
        const username = profile?.username || 'Un membre';
        await notifyEphemeralScreenshot(msg.sender_id, username);
        await notifyScreenshotInChat({
          screenshotterUserId: user.id,
          screenshotterUsername: username,
          otherUserId: msg.sender_id,
          context: 'ephemeral_media',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['ephemeral-media', messageId] });
    } catch (e) {
      console.error('Screenshot notification error:', e);
    }
  }, [media, user, messageId, queryClient]);

  if (isLoading || !media) return null;

  // Already viewed or no signed URL
  if (media.is_viewed && !isUnlimited) {
    onClose();
    return null;
  }

  return (
    <EphemeralMediaViewer
      isOpen={true}
      type={media.media_type as 'image' | 'video'}
      src={media.signedUrl}
      senderName={senderName}
      duration={media.view_duration}
      mediaId={media.id}
      autoStart={true}
      totalItems={1}
      currentItemIndex={0}
      onClose={onClose}
      onViewed={handleViewed}
      onScreenshotDetected={!isUnlimited ? handleScreenshotDetected : undefined}
    />
  );
};

export default SnapAutoViewer;
