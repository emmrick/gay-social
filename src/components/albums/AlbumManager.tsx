import { useState, useRef } from 'react';
import { 
  FolderLock, 
  Plus, 
  Trash2, 
  Share2, 
  X, 
  Clock, 
  ImagePlus, 
  Loader2,
  Users,
  StopCircle,
  ChevronLeft,
  Play,
  ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAlbums } from '@/hooks/useAlbums';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface AlbumManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AlbumManager = ({ isOpen, onClose }: AlbumManagerProps) => {
  const { albums, isLoading, createAlbum, deleteAlbum, addMedia, removeMedia, useAlbumMedia, useAlbumShares, stopSharing } = useAlbums();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [viewingAlbum, setViewingAlbum] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMediaConfirm, setDeleteMediaConfirm] = useState<{ albumId: string; mediaId: string } | null>(null);
  const [showShares, setShowShares] = useState<string | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.error('Veuillez entrer un nom pour l\'album');
      return;
    }

    await createAlbum.mutateAsync({
      name: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined,
    });

    setNewAlbumName('');
    setNewAlbumDescription('');
    setShowCreateForm(false);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    await deleteAlbum.mutateAsync(albumId);
    setDeleteConfirm(null);
    if (selectedAlbum === albumId) {
      setSelectedAlbum(null);
    }
    if (viewingAlbum === albumId) {
      setViewingAlbum(null);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, albumId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert to array and validate
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`"${file.name}" n'est pas une image ou vidéo`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Upload all files
    toast.info(`Upload de ${validFiles.length} fichier(s)...`);
    
    for (const file of validFiles) {
      await addMedia.mutateAsync({ albumId, file });
    }
    
    toast.success(`${validFiles.length} média(s) ajouté(s) !`);
    e.target.value = '';
  };

  const viewingAlbumData = albums.find(a => a.id === viewingAlbum);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-primary" />
              Mes albums privés
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-full py-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {/* Create album button */}
                {!showCreateForm && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-14 rounded-xl border-dashed border-2"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus className="w-5 h-5" />
                    Créer un album privé
                  </Button>
                )}

                {/* Create form */}
                <AnimatePresence>
                  {showCreateForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-secondary rounded-xl space-y-3"
                    >
                      <Input
                        placeholder="Nom de l'album"
                        value={newAlbumName}
                        onChange={(e) => setNewAlbumName(e.target.value)}
                        autoFocus
                        className="h-12"
                      />
                      <Textarea
                        placeholder="Description (optionnel)"
                        value={newAlbumDescription}
                        onChange={(e) => setNewAlbumDescription(e.target.value)}
                        className="min-h-[60px] resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCreateForm(false);
                            setNewAlbumName('');
                            setNewAlbumDescription('');
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCreateAlbum}
                          disabled={createAlbum.isPending}
                        >
                          {createAlbum.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Créer'
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Albums list */}
                {albums.length === 0 && !showCreateForm ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderLock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Aucun album privé</p>
                    <p className="text-sm mt-1">Créez un album pour stocker vos médias privés</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {albums.map((album, index) => (
                      <motion.div
                        key={album.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AlbumCard
                          album={album}
                          isSelected={selectedAlbum === album.id}
                          onSelect={() => setSelectedAlbum(selectedAlbum === album.id ? null : album.id)}
                          onDelete={() => setDeleteConfirm(album.id)}
                          onViewShares={() => setShowShares(album.id)}
                          onViewAll={() => setViewingAlbum(album.id)}
                          onAddMedia={() => {
                            setSelectedAlbum(album.id);
                            fileInputRef.current?.click();
                          }}
                          useAlbumMedia={useAlbumMedia}
                          useAlbumShares={useAlbumShares}
                          onMediaClick={(url, type) => setFullscreenMedia({ url, type })}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* File input for adding media - MULTIPLE */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => selectedAlbum && handleFileSelect(e, selectedAlbum)}
      />

      {/* Delete album confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet album ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les médias de l'album seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteAlbum(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAlbum.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete media confirmation */}
      <AlertDialog open={!!deleteMediaConfirm} onOpenChange={() => setDeleteMediaConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce média ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMedia}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMedia.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shares viewer */}
      {showShares && (
        <SharesViewer
          albumId={showShares}
          isOpen={!!showShares}
          onClose={() => setShowShares(null)}
          useAlbumShares={useAlbumShares}
          stopSharing={stopSharing}
        />
      )}

      {/* Full album viewer */}
      {viewingAlbum && viewingAlbumData && (
        <AlbumFullViewer
          album={viewingAlbumData}
          isOpen={!!viewingAlbum}
          onClose={() => setViewingAlbum(null)}
          useAlbumMedia={useAlbumMedia}
          onDeleteMedia={(mediaId) => setDeleteMediaConfirm({ albumId: viewingAlbum, mediaId })}
          onAddMedia={() => {
            setSelectedAlbum(viewingAlbum);
            fileInputRef.current?.click();
          }}
          onMediaClick={(url, type) => setFullscreenMedia({ url, type })}
        />
      )}

      {/* Fullscreen media viewer */}
      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setFullscreenMedia(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setFullscreenMedia(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            {fullscreenMedia.type === 'image' ? (
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                src={fullscreenMedia.url}
                alt=""
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <motion.video
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                src={fullscreenMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Album card component
interface AlbumCardProps {
  album: any;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onViewShares: () => void;
  onViewAll: () => void;
  onAddMedia: () => void;
  useAlbumMedia: (albumId: string) => any;
  useAlbumShares: (albumId: string) => any;
  onMediaClick: (url: string, type: string) => void;
}

const AlbumCard = ({ 
  album, 
  isSelected, 
  onSelect, 
  onDelete, 
  onViewShares,
  onViewAll,
  onAddMedia,
  useAlbumMedia,
  useAlbumShares,
  onMediaClick,
}: AlbumCardProps) => {
  const { data: media = [] } = useAlbumMedia(album.id);
  const { data: shares = [] } = useAlbumShares(album.id);

  return (
    <div 
      className={cn(
        "p-4 rounded-2xl border-2 transition-all",
        isSelected 
          ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" 
          : "bg-secondary/50 border-transparent hover:bg-secondary"
      )}
    >
      <div className="flex items-start justify-between">
        <button onClick={onSelect} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <FolderLock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">{album.name}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{media.length} média(s)</span>
                {shares.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    <Users className="w-2.5 h-2.5 mr-0.5" />
                    {shares.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {album.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
              {album.description}
            </p>
          )}
        </button>
      </div>

      {/* Actions */}
      {isSelected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-border flex gap-2 flex-wrap"
        >
          <Button size="sm" variant="outline" onClick={onAddMedia} className="rounded-xl">
            <ImagePlus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
          {media.length > 0 && (
            <Button size="sm" variant="outline" onClick={onViewAll} className="rounded-xl">
              <ZoomIn className="w-4 h-4 mr-1" />
              Voir tout ({media.length})
            </Button>
          )}
          {shares.length > 0 && (
            <Button size="sm" variant="outline" onClick={onViewShares} className="rounded-xl">
              <Users className="w-4 h-4 mr-1" />
              Partages
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={onDelete} className="rounded-xl">
            <Trash2 className="w-4 h-4 mr-1" />
            Supprimer
          </Button>
        </motion.div>
      )}

      {/* Media preview grid */}
      {isSelected && media.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 grid grid-cols-3 gap-2"
        >
          {media.slice(0, 5).map((item: any) => (
            <button
              key={item.id}
              onClick={() => onMediaClick(item.media_url, item.media_type)}
              className="aspect-square rounded-xl overflow-hidden bg-secondary relative group"
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
          ))}
          {media.length > 5 && (
            <button
              onClick={onViewAll}
              className="aspect-square rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl hover:bg-primary/30 transition-colors"
            >
              +{media.length - 5}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Full album viewer
interface AlbumFullViewerProps {
  album: any;
  isOpen: boolean;
  onClose: () => void;
  useAlbumMedia: (albumId: string) => any;
  onDeleteMedia: (mediaId: string) => void;
  onAddMedia: () => void;
  onMediaClick: (url: string, type: string) => void;
}

const AlbumFullViewer = ({ album, isOpen, onClose, useAlbumMedia, onDeleteMedia, onAddMedia, onMediaClick }: AlbumFullViewerProps) => {
  const { data: media = [], isLoading } = useAlbumMedia(album.id);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <SheetTitle className="text-left">{album.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{media.length} média(s)</p>
              </div>
            </div>
            <Button size="sm" onClick={onAddMedia} className="rounded-xl">
              <ImagePlus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-full py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImagePlus className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucun média</p>
              <p className="text-sm mt-1">Ajoutez des photos ou vidéos à cet album</p>
              <Button onClick={onAddMedia} className="mt-4">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter des médias
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-20">
              {media.map((item: any, index: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="aspect-square rounded-xl overflow-hidden bg-secondary relative group"
                >
                  <button
                    onClick={() => onMediaClick(item.media_url, item.media_type)}
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
                          <Play className="w-10 h-10 text-white" />
                        </div>
                      </>
                    )}
                  </button>
                  
                  {/* Delete button on hover */}
                  <button
                    onClick={() => onDeleteMedia(item.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

// Shares viewer component
interface SharesViewerProps {
  albumId: string;
  isOpen: boolean;
  onClose: () => void;
  useAlbumShares: (albumId: string) => any;
  stopSharing: any;
}

const SharesViewer = ({ albumId, isOpen, onClose, useAlbumShares, stopSharing }: SharesViewerProps) => {
  const { data: shares = [], isLoading } = useAlbumShares(albumId);

  const handleStopSharing = async (shareId: string) => {
    await stopSharing.mutateAsync(shareId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Partages actifs
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun partage actif</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share: any) => (
              <div 
                key={share.id}
                className="flex items-center justify-between p-3 bg-secondary rounded-xl"
              >
                <div>
                  <p className="text-sm font-medium">Utilisateur</p>
                  {share.expires_at ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expire {formatDistanceToNow(new Date(share.expires_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Illimité</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStopSharing(share.id)}
                  disabled={stopSharing.isPending}
                  className="rounded-xl"
                >
                  {stopSharing.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <StopCircle className="w-4 h-4 mr-1" />
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