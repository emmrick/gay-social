import { useState, useCallback } from 'react';
import { Image, Video, Eye, Loader2 } from 'lucide-react';
import { useEphemeralMedia } from '@/hooks/useEphemeralMedia';
import EphemeralMediaViewer from './EphemeralMediaViewer';

interface EphemeralMessageProps {
  messageId: string;
  messageType: 'image' | 'video';
  senderName: string;
  isOwn: boolean;
}

const EphemeralMessage = ({ messageId, messageType, senderName, isOwn }: EphemeralMessageProps) => {
  const [showMedia, setShowMedia] = useState(false);
  const { media, isLoading, markAsViewed } = useEphemeralMedia(messageId);

  const handleView = useCallback(() => {
    if (media && !media.is_viewed) {
      setShowMedia(true);
    }
  }, [media]);

  const handleClose = useCallback(() => {
    setShowMedia(false);
  }, []);

  const handleViewed = useCallback(async () => {
    if (media) {
      await markAsViewed.mutateAsync(media.id);
    }
  }, [media, markAsViewed]);

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

  // Media already viewed
  if (media.is_viewed && !isOwn) {
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
        disabled={isOwn || media.is_viewed}
        className={`relative flex items-center gap-3 p-4 rounded-xl transition-all ${
          isOwn
            ? 'bg-primary/20 cursor-default'
            : media.is_viewed
            ? 'bg-secondary/30 cursor-default'
            : 'bg-gradient-to-br from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 cursor-pointer'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isOwn ? 'bg-primary/30' : 'bg-gradient-to-br from-primary to-accent'
        }`}>
          {messageType === 'image' ? (
            <Image className="w-6 h-6 text-white" />
          ) : (
            <Video className="w-6 h-6 text-white" />
          )}
        </div>
        
        <div className="text-left">
          <p className="font-medium text-sm">
            {isOwn ? 'Tu as envoyé' : 'Tu as reçu'} {messageType === 'image' ? 'une photo' : 'une vidéo'}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {isOwn 
              ? media.is_viewed 
                ? 'Vu' 
                : 'Non vu'
              : `Appuie pour voir • ${media.view_duration}s`
            }
          </p>
        </div>
      </button>

      {/* Full screen media viewer - POPUP */}
      <EphemeralMediaViewer
        isOpen={showMedia}
        type={messageType}
        src={media.signedUrl}
        senderName={senderName}
        duration={media.view_duration}
        mediaId={media.id}
        onClose={handleClose}
        onViewed={handleViewed}
      />
    </>
  );
};

export default EphemeralMessage;
