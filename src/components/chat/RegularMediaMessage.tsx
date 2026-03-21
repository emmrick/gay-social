import { useState, useEffect } from 'react';
import { Image, Play, Download, ExternalLink, Loader2 } from 'lucide-react';
import GaySocialWatermark from '@/components/security/GaySocialWatermark';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface RegularMediaMessageProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isOwn: boolean;
}

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

const RegularMediaMessage = ({ mediaUrl, mediaType, isOwn }: RegularMediaMessageProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!mediaUrl) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Extract just the path if it's a full URL
        let cleanPath = mediaUrl;
        
        // Handle full Supabase storage URLs
        if (mediaUrl.includes('/storage/v1/object/')) {
          const match = mediaUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
          if (match) {
            cleanPath = match[1];
          }
        }

        const { data, error } = await supabase.storage
          .from('media')
          .createSignedUrl(cleanPath, SIGNED_URL_EXPIRY_SECONDS);

        if (error) {
          console.error('Error getting signed URL:', error);
          setImageError(true);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setImageError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [mediaUrl]);

  const handleDownload = async () => {
    if (!signedUrl) return;
    
    try {
      const response = await fetch(signedUrl);
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

  if (isLoading) {
    return (
      <div className={`rounded-2xl overflow-hidden ${isOwn ? 'bg-primary/20' : 'bg-secondary'} p-4 max-w-[240px]`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  if (imageError || !signedUrl) {
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
          <div className="relative">
            <img
              src={signedUrl}
              alt="Photo partagée"
              className="w-full h-auto max-h-[300px] object-cover rounded-2xl"
              onError={() => setImageError(true)}
            />
            <GaySocialWatermark />
          </div>
        ) : (
          <div className="relative">
            <video
              src={signedUrl}
              className="w-full h-auto max-h-[300px] object-cover rounded-2xl"
              preload="metadata"
            />
            <GaySocialWatermark />
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
              <div className="relative inline-block">
                <img
                  src={signedUrl}
                  alt="Photo partagée"
                  className="max-w-full max-h-[85vh] object-contain"
                />
                <GaySocialWatermark />
              </div>
            ) : (
              <video
                src={signedUrl}
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
