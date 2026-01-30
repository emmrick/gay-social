import { useState } from 'react';
import { Image, Play, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface RegularMediaMessageProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isOwn: boolean;
}

const RegularMediaMessage = ({ mediaUrl, mediaType, isOwn }: RegularMediaMessageProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (imageError) {
    return (
      <div className={`rounded-2xl overflow-hidden ${isOwn ? 'bg-primary/20' : 'bg-secondary'} p-4`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Image className="w-5 h-5" />
          <span className="text-sm">Média non disponible</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`rounded-2xl overflow-hidden cursor-pointer relative group max-w-[240px] ${
          isOwn ? 'ml-auto' : 'mr-auto'
        }`}
        onClick={() => setIsOpen(true)}
      >
        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt="Photo partagée"
            className="w-full h-auto max-h-[300px] object-cover rounded-2xl"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="relative">
            <video
              src={mediaUrl}
              className="w-full h-auto max-h-[300px] object-cover rounded-2xl"
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-foreground fill-current ml-1" />
              </div>
            </div>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ExternalLink className="w-6 h-6 text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center min-h-[50vh]">
            {mediaType === 'image' ? (
              <img
                src={mediaUrl}
                alt="Photo partagée"
                className="max-w-full max-h-[85vh] object-contain"
              />
            ) : (
              <video
                src={mediaUrl}
                className="max-w-full max-h-[85vh] object-contain"
                controls
                autoPlay
              />
            )}
            
            {/* Download button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-4 right-4"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RegularMediaMessage;
