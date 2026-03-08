import { useState, useRef } from 'react';
import { FolderLock, Plus, ImageIcon, Loader2, ChevronRight, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAlbums } from '@/hooks/useAlbums';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import AlbumManager from '@/components/albums/AlbumManager';
import AlbumGalleryViewer from '@/components/albums/AlbumGalleryViewer';

const ProfileAlbumsSection = () => {
  const { albums, isLoading, useAlbumMedia } = useAlbums();
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [galleryState, setGalleryState] = useState<{ albumId: string } | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FolderLock className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Albums privés</h3>
                <p className="text-xs text-muted-foreground">{albums.length} album(s)</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setShowAlbumManager(true)}
            >
              Gérer
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Albums grid */}
          {albums.length === 0 ? (
            <button
              onClick={() => setShowAlbumManager(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2"
            >
              <Plus className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Créer un album</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {albums.slice(0, 6).map((album, index) => (
                <AlbumThumbnail 
                  key={album.id} 
                  album={album} 
                  index={index}
                  useAlbumMedia={useAlbumMedia}
                  onClick={() => setGalleryState({ albumId: album.id })}
                />
              ))}
              {albums.length > 6 && (
                <button
                  onClick={() => setShowAlbumManager(true)}
                  className="aspect-square rounded-xl bg-secondary/50 flex items-center justify-center text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  +{albums.length - 6}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlbumManager isOpen={showAlbumManager} onClose={() => setShowAlbumManager(false)} />

      {/* Direct gallery viewer for clicked album */}
      {galleryState && (
        <AlbumGalleryMediaBridge
          albumId={galleryState.albumId}
          useAlbumMedia={useAlbumMedia}
          onClose={() => setGalleryState(null)}
        />
      )}
    </>
  );
};

/** Bridge component to fetch album media and pass to gallery viewer */
const AlbumGalleryMediaBridge = ({
  albumId,
  useAlbumMedia,
  onClose,
}: {
  albumId: string;
  useAlbumMedia: (albumId: string) => any;
  onClose: () => void;
}) => {
  const { data: media = [] } = useAlbumMedia(albumId);

  return (
    <AlbumGalleryViewer
      media={media}
      initialIndex={0}
      isOpen={true}
      onClose={onClose}
    />
  );
};

interface AlbumThumbnailProps {
  album: any;
  index: number;
  useAlbumMedia: (albumId: string) => any;
  onClick: () => void;
}

const AlbumThumbnail = ({ album, index, useAlbumMedia, onClick }: AlbumThumbnailProps) => {
  const { data: media = [] } = useAlbumMedia(album.id);
  const coverImage = media[0]?.media_url;
  const [revealed, setRevealed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRevealAndOpen = () => {
    if (!revealed) {
      setRevealed(true);
      revealTimerRef.current = setTimeout(() => setRevealed(false), 3000);
    } else {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      setRevealed(false);
      onClick();
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleRevealAndOpen}
      className={cn(
        "aspect-square rounded-xl overflow-hidden relative group",
        "bg-secondary/50 hover:ring-2 hover:ring-primary/50 transition-all"
      )}
    >
      {coverImage ? (
        <>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 z-[1]">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {/* Wrapper to clip the scaled/blurred image */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={coverImage} 
              alt={album.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                !revealed && "blur-lg scale-110",
                !imageLoaded && "opacity-0"
              )}
            />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary/50">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}

      {/* Privacy blur hint */}
      {coverImage && !revealed && imageLoaded && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center">
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-1.5">
            <EyeOff className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      
      {/* Overlay - only show gradient when there's an image */}
      <div className={cn(
        "absolute inset-0 z-[3] flex flex-col justify-end p-2",
        coverImage && "bg-gradient-to-t from-black/70 via-transparent to-transparent"
      )}>
        <p className={cn(
          "text-xs font-medium truncate",
          coverImage ? "text-white" : "text-foreground"
        )}>{album.name}</p>
        <p className={cn(
          "text-[10px]",
          coverImage ? "text-white/70" : "text-muted-foreground"
        )}>{media.length} média(s)</p>
      </div>
    </motion.button>
  );
};

export default ProfileAlbumsSection;
