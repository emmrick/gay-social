import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FolderLock, Plus, Trash2, Share2, X, Clock, ImagePlus, Loader2,
  Users, StopCircle, ChevronLeft, Play, ArrowLeft, MoreVertical, Edit2, Check, Images
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlbums } from '@/hooks/useAlbums';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import AlbumGalleryViewer from './AlbumGalleryViewer';
import UploadProgressOverlay from './UploadProgressOverlay';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

interface AlbumManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialAlbumId?: string;
}

type View = 'list' | 'detail' | 'create';

const AlbumManager = ({ isOpen, onClose, initialAlbumId }: AlbumManagerProps) => {
  const {
    albums, isLoading, createAlbum, deleteAlbum,
    addMediaWithProgress, removeMedia, useAlbumMedia, useAlbumShares, stopSharing
  } = useAlbums();

  const [view, setView] = useState<View>('list');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMediaConfirm, setDeleteMediaConfirm] = useState<{ albumId: string; mediaId: string } | null>(null);
  const [showShares, setShowShares] = useState<string | null>(null);
  const [galleryState, setGalleryState] = useState<{ media: any[]; index: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigate to initial album when opening
  useEffect(() => {
    if (isOpen && initialAlbumId) {
      setSelectedAlbumId(initialAlbumId);
      setView('detail');
    }
  }, [isOpen, initialAlbumId]);

  // Reset state when closing
  const handleClose = useCallback(() => {
    setView('list');
    setSelectedAlbumId(null);
    setNewAlbumName('');
    setNewAlbumDescription('');
    onClose();
  }, [onClose]);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.error('Entre un nom pour l\'album');
      return;
    }
    await createAlbum.mutateAsync({
      name: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined,
    });
    setNewAlbumName('');
    setNewAlbumDescription('');
    setView('list');
  };

  const handleDeleteAlbum = async (albumId: string) => {
    await deleteAlbum.mutateAsync(albumId);
    setDeleteConfirm(null);
    if (selectedAlbumId === albumId) {
      setSelectedAlbumId(null);
      setView('list');
    }
  };

  const handleDeleteMedia = async () => {
    if (!deleteMediaConfirm) return;
    await removeMedia.mutateAsync({
      albumId: deleteMediaConfirm.albumId,
      mediaId: deleteMediaConfirm.mediaId,
    });
    setDeleteMediaConfirm(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedAlbumId) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`"${file.name}" n'est pas un média valide`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    setIsUploading(true);
    const initialProgress: UploadProgress[] = validFiles.map(file => ({
      fileName: file.name, progress: 0, status: 'pending' as const,
    }));
    setUploadProgress(initialProgress);

    let completedCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'uploading' } : p));
      try {
        await addMediaWithProgress(selectedAlbumId, validFiles[i], (progress) => {
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, progress } : p));
        });
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'complete', progress: 100 } : p));
        completedCount++;
      } catch {
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p));
        toast.error(`Erreur: "${validFiles[i].name}"`);
      }
    }
    if (completedCount > 0) toast.success(`${completedCount} média(s) ajouté(s)`);
    setTimeout(() => { setIsUploading(false); setUploadProgress([]); }, 1500);
    e.target.value = '';
  };

  const selectedAlbum = albums.find(a => a.id === selectedAlbumId);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-border">
            {view !== 'list' ? (
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => { setView('list'); setSelectedAlbumId(null); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : null}
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-lg">
                {view === 'create' ? 'Nouvel album' : view === 'detail' && selectedAlbum ? selectedAlbum.name : 'Mes albums'}
              </h2>
              {view === 'list' && (
                <p className="text-xs text-muted-foreground">{albums.length} album{albums.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            {view === 'list' && (
              <Button size="sm" className="rounded-xl gap-1.5 h-9" onClick={() => setView('create')}>
                <Plus className="w-4 h-4" />
                Créer
              </Button>
            )}
            {view === 'detail' && selectedAlbumId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSelectedAlbumId(selectedAlbumId); fileInputRef.current?.click(); }}>
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Ajouter des médias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShares(selectedAlbumId)}>
                    <Users className="w-4 h-4 mr-2" />
                    Voir les partages
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(selectedAlbumId)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer l'album
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 pb-20">
              <AnimatePresence mode="wait">
                {view === 'list' && (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AlbumListView
                      albums={albums}
                      isLoading={isLoading}
                      useAlbumMedia={useAlbumMedia}
                      useAlbumShares={useAlbumShares}
                      onSelect={(id) => { setSelectedAlbumId(id); setView('detail'); }}
                      onCreate={() => setView('create')}
                    />
                  </motion.div>
                )}
                {view === 'create' && (
                  <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <CreateAlbumView
                      name={newAlbumName}
                      description={newAlbumDescription}
                      onNameChange={setNewAlbumName}
                      onDescChange={setNewAlbumDescription}
                      onSubmit={handleCreateAlbum}
                      isPending={createAlbum.isPending}
                    />
                  </motion.div>
                )}
                {view === 'detail' && selectedAlbumId && (
                  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                    <AlbumDetailView
                      albumId={selectedAlbumId}
                      useAlbumMedia={useAlbumMedia}
                      onAddMedia={() => fileInputRef.current?.click()}
                      onDeleteMedia={(mediaId) => setDeleteMediaConfirm({ albumId: selectedAlbumId, mediaId })}
                      onMediaClick={(media, index) => setGalleryState({ media, index })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Delete album dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet album ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les médias et partages seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteAlbum(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAlbum.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete media dialog */}
      <AlertDialog open={!!deleteMediaConfirm} onOpenChange={() => setDeleteMediaConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce média ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMedia}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shares dialog */}
      {showShares && (
        <SharesDialog
          albumId={showShares}
          isOpen={!!showShares}
          onClose={() => setShowShares(null)}
          useAlbumShares={useAlbumShares}
          stopSharing={stopSharing}
        />
      )}

      {/* Gallery viewer */}
      <AlbumGalleryViewer
        media={galleryState?.media || []}
        initialIndex={galleryState?.index || 0}
        isOpen={!!galleryState}
        onClose={() => setGalleryState(null)}
        onDelete={(mediaId) => {
          if (selectedAlbumId) {
            setDeleteMediaConfirm({ albumId: selectedAlbumId, mediaId });
          }
        }}
      />

      {/* Upload progress */}
      <UploadProgressOverlay
        isVisible={isUploading}
        uploads={uploadProgress}
        totalFiles={uploadProgress.length}
        completedFiles={uploadProgress.filter(u => u.status === 'complete').length}
      />
    </>
  );
};

/* ===================== LIST VIEW ===================== */
const AlbumListView = ({
  albums, isLoading, useAlbumMedia, useAlbumShares, onSelect, onCreate,
}: {
  albums: any[];
  isLoading: boolean;
  useAlbumMedia: (id: string) => any;
  useAlbumShares: (id: string) => any;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-3xl bg-muted/50 mx-auto flex items-center justify-center mb-5">
          <Images className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Aucun album</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Crée ton premier album pour organiser et partager tes photos et vidéos de manière privée.
        </p>
        <Button onClick={onCreate} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Créer mon premier album
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {albums.map((album, i) => (
        <AlbumListItem
          key={album.id}
          album={album}
          index={i}
          useAlbumMedia={useAlbumMedia}
          useAlbumShares={useAlbumShares}
          onClick={() => onSelect(album.id)}
        />
      ))}
    </div>
  );
};

const AlbumListItem = ({
  album, index, useAlbumMedia, useAlbumShares, onClick,
}: {
  album: any;
  index: number;
  useAlbumMedia: (id: string) => any;
  useAlbumShares: (id: string) => any;
  onClick: () => void;
}) => {
  const { data: media = [] } = useAlbumMedia(album.id);
  const { data: shares = [] } = useAlbumShares(album.id);
  const coverImages = media.slice(0, 3);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-muted/50 active:bg-muted transition-colors group text-left"
    >
      {/* Cover stack */}
      <div className="relative w-16 h-16 flex-shrink-0">
        {coverImages.length > 0 ? (
          coverImages.slice(0, 3).map((img: any, i: number) => (
            <div
              key={img.id}
              className={cn(
                "absolute rounded-xl overflow-hidden border-2 border-card shadow-sm",
                i === 0 && "w-14 h-14 top-0 left-0 z-[3]",
                i === 1 && "w-12 h-12 top-1 left-2 z-[2] opacity-60",
                i === 2 && "w-10 h-10 top-2 left-4 z-[1] opacity-30",
              )}
            >
              <img src={img.media_url} alt="" className="w-full h-full object-cover" />
            </div>
          ))
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted/60 flex items-center justify-center">
            <FolderLock className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{album.name}</p>
        {album.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{album.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] text-muted-foreground">
            {media.length} {media.length !== 1 ? 'médias' : 'média'}
          </span>
          {shares.length > 0 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              {shares.length} partage{shares.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <ChevronLeft className="w-4 h-4 text-muted-foreground/40 rotate-180 group-hover:text-foreground transition-colors flex-shrink-0" />
    </motion.button>
  );
};

/* ===================== CREATE VIEW ===================== */
const CreateAlbumView = ({
  name, description, onNameChange, onDescChange, onSubmit, isPending,
}: {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) => (
  <div className="space-y-5 max-w-md mx-auto">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
      <FolderLock className="w-8 h-8 text-primary" />
    </div>
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Nom de l'album *</label>
        <Input
          placeholder="Ex: Mes photos préférées"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-12 rounded-xl"
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Description</label>
        <Textarea
          placeholder="Ajoute une description (optionnel)"
          value={description}
          onChange={(e) => onDescChange(e.target.value)}
          className="min-h-[80px] rounded-xl resize-none"
        />
      </div>
    </div>
    <Button
      className="w-full h-12 rounded-xl text-base font-semibold"
      onClick={onSubmit}
      disabled={isPending || !name.trim()}
    >
      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer l\'album'}
    </Button>
  </div>
);

/* ===================== DETAIL VIEW ===================== */
const AlbumDetailView = ({
  albumId, useAlbumMedia, onAddMedia, onDeleteMedia, onMediaClick,
}: {
  albumId: string;
  useAlbumMedia: (id: string) => any;
  onAddMedia: () => void;
  onDeleteMedia: (mediaId: string) => void;
  onMediaClick: (media: any[], index: number) => void;
}) => {
  const { data: media = [], isLoading } = useAlbumMedia(albumId);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleTouchStart = (mediaId: string) => {
    longPressTimer.current = setTimeout(() => setLongPressId(mediaId), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-3xl bg-muted/50 mx-auto flex items-center justify-center mb-5">
          <ImagePlus className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Album vide</h3>
        <p className="text-sm text-muted-foreground mb-6">Ajoute des photos ou vidéos pour commencer</p>
        <Button onClick={onAddMedia} className="rounded-xl gap-2">
          <ImagePlus className="w-4 h-4" />
          Ajouter des médias
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add media button */}
      <button
        onClick={onAddMedia}
        className="w-full py-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ImagePlus className="w-4 h-4" />
        Ajouter des médias
      </button>

      {/* Media grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {media.map((item: any, index: number) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            className="aspect-square rounded-xl overflow-hidden bg-muted relative group"
            onTouchStart={() => handleTouchStart(item.id)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <button
              onClick={() => onMediaClick(media, index)}
              className="w-full h-full"
            >
              {item.media_type === 'image' ? (
                <img
                  src={item.media_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <>
                  <video src={item.media_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </>
              )}
            </button>

            {/* Delete button - visible on hover (desktop) or long press (mobile) */}
            <AnimatePresence>
              {longPressId === item.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
                  onClick={() => { onDeleteMedia(item.id); setLongPressId(null); }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Trash2 className="w-6 h-6 text-white" />
                    <span className="text-xs text-white font-medium">Supprimer</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteMedia(item.id); }}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white items-center justify-center shadow-lg hidden group-hover:flex transition-all hover:bg-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground pt-2">
        Appui long sur un média pour le supprimer
      </p>
    </div>
  );
};

/* ===================== SHARES DIALOG ===================== */
const SharesDialog = ({
  albumId, isOpen, onClose, useAlbumShares, stopSharing,
}: {
  albumId: string;
  isOpen: boolean;
  onClose: () => void;
  useAlbumShares: (id: string) => any;
  stopSharing: any;
}) => {
  const { data: shares = [], isLoading } = useAlbumShares(albumId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Partages actifs
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun partage actif</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shares.map((share: any) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
              >
                <div>
                  <p className="text-sm font-medium">Utilisateur</p>
                  {share.expires_at ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expire {formatDistanceToNow(new Date(share.expires_at), { addSuffix: true, locale: fr })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Illimité</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => stopSharing.mutateAsync(share.id)}
                  disabled={stopSharing.isPending}
                  className="rounded-xl h-8 text-xs"
                >
                  {stopSharing.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <StopCircle className="w-3.5 h-3.5 mr-1" />
                      Arrêter
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AlbumManager;
