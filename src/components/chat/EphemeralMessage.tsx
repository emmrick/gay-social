import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Image, Video, Eye, Loader2, Infinity, AlertTriangle } from 'lucide-react';
import { useEphemeralMedia } from '@/hooks/useEphemeralMedia';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import SequentialEphemeralViewer, { EphemeralMediaItem } from './SequentialEphemeralViewer';
import { notifyEphemeralScreenshot } from '@/services/pushNotificationService';
import { notifyScreenshotInChat } from '@/services/screenshotNotificationService';

interface EphemeralMessageProps {
  messageId: string;
  messageType: 'image' | 'video';
  senderName: string;
  isOwn: boolean;
  chatRoomId?: string;
  recipientId?: string;
  allEphemeralMessageIds?: string[];
}

const EphemeralMessage = ({ messageId, messageType, senderName, isOwn, chatRoomId, recipientId }: EphemeralMessageProps) => {
  const [showMedia, setShowMedia] = useState(false);
  const { media, isLoading, markAsViewed } = useEphemeralMedia(messageId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isUnlimited = media?.view_duration === 0;

  const handleView = useCallback(() => {
    if (media && !media.is_viewed) {
      setShowMedia(true);
    }
  }, [media]);

  const handleClose = useCallback(() => {
    setShowMedia(false);
  }, []);

  const handleViewed = useCallback(async () => {
    if (media && !isUnlimited) {
      await markAsViewed.mutateAsync(media.id);
    }
  }, [media, markAsViewed, isUnlimited]);

  const handleSaveToConversation = useCallback(async () => {
    if (!media || !user) return;
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: media.message_id ? (await supabase.from('messages').select('sender_id').eq('id', messageId).single()).data?.sender_id : user.id,
        chat_room_id: chatRoomId || null,
        recipient_id: recipientId || null,
        content: media.signedUrl.split('?')[0],
        message_type: messageType,
        is_private: !!recipientId,
      });
    if (error) throw error;
    if (chatRoomId) queryClient.invalidateQueries({ queryKey: ['messages', chatRoomId] });
    if (recipientId) queryClient.invalidateQueries({ queryKey: ['private-messages', user.id, recipientId] });
  }, [media, user, chatRoomId, recipientId, messageType, messageId, queryClient]);

  const handleScreenshotDetected = useCallback(async () => {
    if (!media || !user || isOwn) return;
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
  }, [media, user, isOwn, messageId, queryClient]);

  const sequentialItems: EphemeralMediaItem[] = useMemo(() => {
    if (!media) return [];
    const currentItem: EphemeralMediaItem = {
      messageId,
      mediaId: media.id,
      type: messageType,
      src: media.signedUrl,
      senderName,
      duration: media.view_duration,
      isOwn,
      onViewed: handleViewed,
      onSaveToConversation: isUnlimited && !isOwn ? handleSaveToConversation : undefined,
      canReplay: false,
      onReplay: undefined,
      onScreenshotDetected: !isOwn && !isUnlimited ? handleScreenshotDetected : undefined,
    };
    return [currentItem];
  }, [media, messageId, messageType, senderName, isOwn, handleViewed, isUnlimited, handleSaveToConversation, handleScreenshotDetected]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-muted-foreground">
        {messageType === 'image' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        <span className="text-xs">Média non disponible</span>
      </div>
    );
  }

  // After viewing: the parent EphemeralMessageRow handles hiding the entire row
  // Here we just return null for the bubble content
  if (media.is_viewed && !isOwn && !isUnlimited) {
    return null;
  }

  // For sender: if viewed, hide too (parent handles investigation display)
  if (isOwn && media.is_viewed && !isUnlimited) {
    return null;
  }

  // Screenshot investigation display is handled by parent EphemeralMessageRow

  const iconBg = isUnlimited ? 'bg-green-500' : 'bg-primary';

  const statusText = isUnlimited
    ? (isOwn ? (media.is_viewed ? 'Vu • Enregistrable' : 'Non vu') : 'Expire après consultation')
    : isOwn
    ? (media.is_viewed ? 'Vu' : 'Non vu')
    : 'Expire après consultation';

  const label = messageType === 'image' ? 'Photo éphémère' : 'Vidéo éphémère';

  return (
    <>
      <button
        onClick={handleView}
        disabled={isOwn || (media.is_viewed && !isUnlimited)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all max-w-[280px]',
          isOwn
            ? 'bg-primary/10 cursor-default'
            : 'hover:bg-secondary/60 cursor-pointer bg-secondary/40'
        )}
      >
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {messageType === 'image' ? <Image className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
        </div>
        <div className="text-left min-w-0">
          <p className="font-medium text-sm truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{statusText}</p>
        </div>
      </button>

      <SequentialEphemeralViewer
        isOpen={showMedia}
        items={sequentialItems}
        startIndex={0}
        onClose={handleClose}
      />
    </>
  );
};

export default EphemeralMessage;
