import { useState, useCallback } from 'react';
import { Image, Video, Eye, Loader2, Infinity } from 'lucide-react';
import { useEphemeralMedia } from '@/hooks/useEphemeralMedia';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import EphemeralMediaViewer from './EphemeralMediaViewer';
import { notifyEphemeralScreenshot } from '@/services/pushNotificationService';

interface EphemeralMessageProps {
  messageId: string;
  messageType: 'image' | 'video';
  senderName: string;
  isOwn: boolean;
  chatRoomId?: string;
  recipientId?: string;
}

const EphemeralMessage = ({ messageId, messageType, senderName, isOwn, chatRoomId, recipientId }: EphemeralMessageProps) => {
  const [showMedia, setShowMedia] = useState(false);
  const { media, isLoading, markAsViewed } = useEphemeralMedia(messageId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isUnlimited = media?.view_duration === 0;
  const canReplay = !isOwn && media?.is_viewed && !isUnlimited && (media?.replay_count ?? 0) < 1;

  const handleView = useCallback(() => {
    if (media && (!media.is_viewed || canReplay)) {
      setShowMedia(true);
    }
  }, [media, canReplay]);

  const handleClose = useCallback(() => {
    setShowMedia(false);
  }, []);

  const handleViewed = useCallback(async () => {
    if (media && !isUnlimited) {
      await markAsViewed.mutateAsync(media.id);
    }
  }, [media, markAsViewed, isUnlimited]);

  const handleReplay = useCallback(async () => {
    if (!media) return;
    // Use replay via the hook
    try {
      await supabase
        .from('ephemeral_media')
        .update({ replay_count: (media.replay_count ?? 0) + 1 })
        .eq('id', media.id);
      queryClient.invalidateQueries({ queryKey: ['ephemeral-media', messageId] });
    } catch (e) {
      console.error('Replay error:', e);
    }
  }, [media, messageId, queryClient]);

  // Save media to conversation (convert ephemeral to regular)
  const handleSaveToConversation = useCallback(async () => {
    if (!media || !user) return;

    // Create a new regular message with the media URL
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: media.message_id ? (await supabase.from('messages').select('sender_id').eq('id', messageId).single()).data?.sender_id : user.id,
        chat_room_id: chatRoomId || null,
        recipient_id: recipientId || null,
        content: media.signedUrl.split('?')[0], // Get the public URL without signature
        message_type: messageType,
        is_private: !!recipientId,
      });

    if (error) throw error;

    // Invalidate queries to refresh the message list
    if (chatRoomId) {
      queryClient.invalidateQueries({ queryKey: ['messages', chatRoomId] });
    }
    if (recipientId) {
      queryClient.invalidateQueries({ queryKey: ['private-messages', user.id, recipientId] });
    }
  }, [media, user, chatRoomId, recipientId, messageType, messageId, queryClient]);

  // Handle screenshot detection: record in DB + notify sender
  const handleScreenshotDetected = useCallback(async () => {
    if (!media || !user || isOwn) return;
    try {
      // Record screenshot in DB
      await supabase
        .from('ephemeral_media')
        .update({
          screenshot_detected: true,
          screenshot_detected_at: new Date().toISOString(),
        })
        .eq('id', media.id);

      // Get sender info from the original message
      const { data: msg } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (msg?.sender_id) {
        // Get current user's username for the notification
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        await notifyEphemeralScreenshot(
          msg.sender_id,
          profile?.username || 'Un membre'
        );
      }
    } catch (e) {
      console.error('Screenshot notification error:', e);
    }
  }, [media, user, isOwn, messageId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 rounded-xl bg-secondary/50">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 text-muted-foreground">
        {messageType === 'image' ? (
          <Image className="w-5 h-5" />
        ) : (
          <Video className="w-5 h-5" />
        )}
        <span className="text-sm">Média non disponible</span>
      </div>
    );
  }

  // Media already viewed and no replay left (only for non-unlimited)
  if (media.is_viewed && !isOwn && !isUnlimited && !canReplay) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 text-muted-foreground">
        {messageType === 'image' ? (
          <Image className="w-5 h-5" />
        ) : (
          <Video className="w-5 h-5" />
        )}
        <span className="text-sm">
          {messageType === 'image' ? 'Photo' : 'Vidéo'} déjà vue
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Media preview button */}
      <button
        onClick={handleView}
        disabled={isOwn || (media.is_viewed && !isUnlimited && !canReplay)}
        className={`relative flex items-center gap-3 p-4 rounded-xl transition-all ${
          isOwn
            ? 'bg-primary/20 cursor-default'
            : canReplay
            ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 cursor-pointer border border-amber-500/20'
            : (media.is_viewed && !isUnlimited)
            ? 'bg-secondary/30 cursor-default'
            : isUnlimited
            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 cursor-pointer border border-green-500/20'
            : 'bg-gradient-to-br from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 cursor-pointer'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isOwn ? 'bg-primary/30' : canReplay ? 'bg-gradient-to-br from-amber-500 to-orange-500' : isUnlimited ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-primary to-accent'
        }`}>
          {messageType === 'image' ? (
            <Image className="w-6 h-6 text-white" />
          ) : (
            <Video className="w-6 h-6 text-white" />
          )}
        </div>
        
        <div className="text-left">
          <p className="font-medium text-sm">
            {canReplay ? '🔄 Replay disponible' : isOwn ? 'Tu as envoyé' : 'Tu as reçu'} {!canReplay && (messageType === 'image' ? 'une photo' : 'une vidéo')}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isUnlimited ? (
              <>
                <Infinity className="w-3 h-3 text-green-500" />
                <span className="text-green-500">
                  {isOwn 
                    ? (media.is_viewed ? 'Vu • Enregistrable' : 'Non vu • Enregistrable')
                    : 'Appuie pour voir • Enregistrable'
                  }
                </span>
              </>
            ) : canReplay ? (
              <span className="text-amber-500">Appuie pour revoir • 1 replay</span>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                {isOwn 
                  ? media.is_viewed 
                    ? 'Vu' 
                    : 'Non vu'
                  : `Appuie pour voir • ${media.view_duration}s`
                }
              </>
            )}
          </p>
        </div>
      </button>

      {/* Full screen media viewer - Snapchat style */}
      <EphemeralMediaViewer
        isOpen={showMedia}
        type={messageType}
        src={media.signedUrl}
        senderName={senderName}
        duration={media.view_duration}
        mediaId={media.id}
        onClose={handleClose}
        onViewed={handleViewed}
        onSaveToConversation={isUnlimited && !isOwn ? handleSaveToConversation : undefined}
        canReplay={canReplay}
        onReplay={canReplay ? handleReplay : undefined}
        onScreenshotDetected={!isOwn && !isUnlimited ? handleScreenshotDetected : undefined}
      />
    </>
  );
};

export default EphemeralMessage;
