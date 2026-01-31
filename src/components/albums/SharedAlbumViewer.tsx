import { useState } from 'react';
import { FolderLock, Clock, Eye, X, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';

interface SharedAlbumViewerProps {
  albumId: string;
  albumName: string;
  expiresAt: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to extract storage path from URL and create signed URL
const getSignedUrl = async (mediaUrl: string): Promise<string> => {
  // Extract the path from the public URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/media/userId/albumId/filename
  const match = mediaUrl.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
  if (!match) return mediaUrl;
  
  const path = match[1];
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUrl(path, 3600); // 1 hour
  
  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error);
    return mediaUrl;
  }
  
  return data.signedUrl;
};

const SharedAlbumViewer = ({ albumId, albumName, expiresAt, isOpen, onClose }: SharedAlbumViewerProps) => {
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: string } | null>(null);
  const { 
    isSuspended, 
    isBlocked, 
    getSuspensionTimeLeft, 
    preventContextMenu, 
    preventDrag 
  } = useScreenshotProtection();
  // Fetch album media with signed URLs
  const { data: media = [], isLoading } = useQuery({
    queryKey: ['shared-album-media', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Generate signed URLs for all media
      const mediaWithSignedUrls = await Promise.all(
        (data || []).map(async (item) => ({
          ...item,
          signed_url: await getSignedUrl(item.media_url),
        }))
      );
      
      return mediaWithSignedUrls;
    },
    enabled: isOpen && !!albumId,
  });

  // Show suspended screen if user is suspended
  if (isSuspended) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Accès suspendu</h3>
            <p className="text-sm text-muted-foreground">
              Votre accès aux albums est temporairement suspendu suite à une tentative de capture d'écran.
            </p>
            <p className="text-sm font-medium text-destructive">
              Temps restant : {getSuspensionTimeLeft()}
            </p>
            <Button onClick={onClose} variant="outline">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-primary" />
            {albumName}
          </DialogTitle>
          {expiresAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Accès expire {formatDistanceToNow(new Date(expiresAt), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Cet album est vide</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 relative">
              {/* Screenshot block overlay */}
              {isBlocked && (
                <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
                  <p className="text-white text-sm font-medium">Capture détectée</p>
                </div>
              )}
              {media.map((item) => (
                <div 
                  key={item.id} 
                  className="aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer"
                  onClick={() => setFullscreenMedia({ url: item.signed_url, type: item.media_type })}
                  onContextMenu={preventContextMenu}
                  onDragStart={preventDrag}
                >
                  {item.media_type === 'image' ? (
                    <img 
                      src={item.signed_url} 
                      alt="" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform select-none pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <video 
                      src={item.signed_url} 
                      className="w-full h-full object-cover select-none pointer-events-none"
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Fullscreen media viewer with protection */}
        {fullscreenMedia && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setFullscreenMedia(null)}
            onContextMenu={preventContextMenu}
          >
            {/* Screenshot block overlay in fullscreen */}
            {isBlocked && (
              <div className="absolute inset-0 z-[101] bg-black flex items-center justify-center">
                <p className="text-white text-lg font-medium">Capture détectée</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-[102]"
              onClick={() => setFullscreenMedia(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            {fullscreenMedia.type === 'image' ? (
              <img 
                src={fullscreenMedia.url} 
                alt="" 
                className="max-w-full max-h-full object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={preventContextMenu}
                onDragStart={preventDrag}
                draggable={false}
              />
            ) : (
              <video 
                src={fullscreenMedia.url} 
                className="max-w-full max-h-full select-none"
                controls
                autoPlay
                onClick={(e) => e.stopPropagation()}
                onContextMenu={preventContextMenu}
                controlsList="nodownload"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SharedAlbumViewer;
