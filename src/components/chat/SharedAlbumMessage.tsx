import { useState } from 'react';
import { FolderLock, Eye, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SharedAlbumViewer from '@/components/albums/SharedAlbumViewer';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SharedAlbumMessageProps {
  shareId: string;
  albumId: string;
  albumName: string;
  expiresAt: string | null;
  sharedByUserId: string;
  isOwn: boolean;
}

const SharedAlbumMessage = ({
  shareId,
  albumId,
  albumName,
  expiresAt,
  sharedByUserId,
  isOwn,
}: SharedAlbumMessageProps) => {
  const { user } = useAuth();
  const [showViewer, setShowViewer] = useState(false);

  // Get media count for the album
  const { data: mediaCount = 0 } = useQuery({
    queryKey: ['album-media-count', albumId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('album_media')
        .select('*', { count: 'exact', head: true })
        .eq('album_id', albumId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!albumId,
  });

  // Check if expired
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 text-muted-foreground">
        <FolderLock className="w-5 h-5" />
        <span className="text-sm">Album expiré</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => !isOwn && setShowViewer(true)}
        disabled={isOwn}
        className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
          isOwn
            ? 'bg-primary/20 cursor-default'
            : 'bg-gradient-to-br from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 cursor-pointer'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isOwn ? 'bg-primary/30' : 'bg-gradient-to-br from-primary to-accent'
          }`}
        >
          <FolderLock className="w-6 h-6 text-white" />
        </div>

        <div className="text-left flex-1">
          <p className="font-medium text-sm">
            {isOwn ? 'Album partagé' : 'Album privé reçu'}
          </p>
          <p className="text-xs text-foreground/80">{albumName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Eye className="w-3 h-3" />
            {mediaCount} média{mediaCount !== 1 ? 's' : ''}
            {!isOwn && ' • Appuie pour voir'}
          </p>
          {expiresAt && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              Expire{' '}
              {formatDistanceToNow(new Date(expiresAt), {
                addSuffix: true,
                locale: fr,
              })}
            </p>
          )}
        </div>
      </button>

      {/* Album Viewer Dialog */}
      <SharedAlbumViewer
        albumId={albumId}
        albumName={albumName}
        expiresAt={expiresAt}
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
      />
    </>
  );
};

export default SharedAlbumMessage;
