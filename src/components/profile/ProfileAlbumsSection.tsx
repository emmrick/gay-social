import { useState } from 'react';
import { FolderLock, Plus, ImageIcon, Loader2, Lock, Users, ChevronRight, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlbums } from '@/hooks/useAlbums';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import AlbumManager from '@/components/albums/AlbumManager';

const ProfileAlbumsSection = () => {
  const { albums, isLoading, useAlbumMedia } = useAlbums();
  const [managerState, setManagerState] = useState<{ open: boolean; initialAlbumId?: string }>({ open: false });

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <FolderLock className="w-4.5 h-4.5 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Mes albums</h3>
                <p className="text-[11px] text-muted-foreground">
                  {albums.length === 0 ? 'Aucun album' : `${albums.length} album${albums.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 rounded-xl h-8"
              onClick={() => setManagerState({ open: true })}
            >
              <Plus className="w-3.5 h-3.5" />
              {albums.length === 0 ? 'Créer' : 'Gérer'}
            </Button>
          </div>

          {/* Albums */}
          {albums.length === 0 ? (
            <button
              onClick={() => setManagerState({ open: true })}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-border/70 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center gap-2.5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Créer un album</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Photos et vidéos privées</p>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {albums.slice(0, 4).map((album, index) => (
                <AlbumRow
                  key={album.id}
                  album={album}
                  index={index}
                  useAlbumMedia={useAlbumMedia}
                  onClick={() => setManagerState({ open: true, initialAlbumId: album.id })}
                />
              ))}
              {albums.length > 4 && (
                <button
                  onClick={() => setManagerState({ open: true })}
                  className="w-full py-2.5 text-center text-xs font-medium text-primary hover:underline"
                >
                  Voir les {albums.length - 4} autres albums →
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlbumManager
        isOpen={managerState.open}
        onClose={() => setManagerState({ open: false })}
        initialAlbumId={managerState.initialAlbumId}
      />
    </>
  );
};

interface AlbumRowProps {
  album: any;
  index: number;
  useAlbumMedia: (albumId: string) => any;
  onClick: () => void;
}

const AlbumRow = ({ album, index, useAlbumMedia, onClick }: AlbumRowProps) => {
  const { data: media = [] } = useAlbumMedia(album.id);
  const coverImage = media[0]?.media_url;
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted/70 flex-shrink-0 relative">
        {coverImage ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={coverImage}
              alt={album.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover blur-md scale-110 transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-white drop-shadow-md" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-sm truncate">{album.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {media.length} {media.length > 1 ? 'médias' : 'média'}
          </span>
          {album.is_private && (
            <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
              <Lock className="w-2.5 h-2.5 mr-0.5" />
              Privé
            </Badge>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0" />
    </motion.button>
  );
};

export default ProfileAlbumsSection;
