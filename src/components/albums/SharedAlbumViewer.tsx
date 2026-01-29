import { FolderLock, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlbums } from '@/hooks/useAlbums';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SharedAlbumViewerProps {
  albumId: string;
  albumName: string;
  expiresAt: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const SharedAlbumViewer = ({ albumId, albumName, expiresAt, isOpen, onClose }: SharedAlbumViewerProps) => {
  // Fetch album media
  const { data: media = [], isLoading } = useQuery({
    queryKey: ['shared-album-media', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!albumId,
  });

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
            <div className="grid grid-cols-3 gap-2">
              {media.map((item) => (
                <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-secondary">
                  {item.media_type === 'image' ? (
                    <img 
                      src={item.media_url} 
                      alt="" 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    />
                  ) : (
                    <video 
                      src={item.media_url} 
                      className="w-full h-full object-cover" 
                      controls
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SharedAlbumViewer;
