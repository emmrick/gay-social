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
  StopCircle
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

interface AlbumManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AlbumManager = ({ isOpen, onClose }: AlbumManagerProps) => {
  const { albums, isLoading, createAlbum, deleteAlbum, addMedia, useAlbumMedia, useAlbumShares, stopSharing } = useAlbums();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showShares, setShowShares] = useState<string | null>(null);
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
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, albumId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Seules les images et vidéos sont acceptées');
      return;
    }

    await addMedia.mutateAsync({ albumId, file });
    e.target.value = '';
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
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
              <div className="space-y-4">
                {/* Create album button */}
                {!showCreateForm && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Créer un album privé
                  </Button>
                )}

                {/* Create form */}
                {showCreateForm && (
                  <div className="p-4 bg-secondary rounded-xl space-y-3">
                    <Input
                      placeholder="Nom de l'album"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      autoFocus
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
                  </div>
                )}

                {/* Albums list */}
                {albums.length === 0 && !showCreateForm ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderLock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun album privé</p>
                    <p className="text-sm mt-1">Créez un album pour stocker vos médias privés</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {albums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={album}
                        isSelected={selectedAlbum === album.id}
                        onSelect={() => setSelectedAlbum(selectedAlbum === album.id ? null : album.id)}
                        onDelete={() => setDeleteConfirm(album.id)}
                        onViewShares={() => setShowShares(album.id)}
                        onAddMedia={() => {
                          setSelectedAlbum(album.id);
                          fileInputRef.current?.click();
                        }}
                        useAlbumMedia={useAlbumMedia}
                        useAlbumShares={useAlbumShares}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* File input for adding media */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => selectedAlbum && handleFileSelect(e, selectedAlbum)}
      />

      {/* Delete confirmation */}
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
  onAddMedia: () => void;
  useAlbumMedia: (albumId: string) => any;
  useAlbumShares: (albumId: string) => any;
}

const AlbumCard = ({ 
  album, 
  isSelected, 
  onSelect, 
  onDelete, 
  onViewShares,
  onAddMedia,
  useAlbumMedia,
  useAlbumShares,
}: AlbumCardProps) => {
  const { data: media = [] } = useAlbumMedia(album.id);
  const { data: shares = [] } = useAlbumShares(album.id);

  return (
    <div 
      className={cn(
        "p-4 rounded-xl border transition-all",
        isSelected 
          ? "bg-primary/10 border-primary" 
          : "bg-secondary/50 border-transparent hover:bg-secondary"
      )}
    >
      <div className="flex items-start justify-between">
        <button onClick={onSelect} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-primary" />
            <h4 className="font-medium">{album.name}</h4>
          </div>
          {album.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {album.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{media.length} média(s)</span>
            {shares.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Partagé avec {shares.length}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Actions */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-border flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onAddMedia}>
            <ImagePlus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
          {shares.length > 0 && (
            <Button size="sm" variant="outline" onClick={onViewShares}>
              <Users className="w-4 h-4 mr-1" />
              Partages ({shares.length})
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Supprimer
          </Button>
        </div>
      )}

      {/* Media preview grid */}
      {isSelected && media.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {media.slice(0, 8).map((item: any) => (
            <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-secondary">
              {item.media_type === 'image' ? (
                <img src={item.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={item.media_url} className="w-full h-full object-cover" />
              )}
            </div>
          ))}
          {media.length > 8 && (
            <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-sm">
              +{media.length - 8}
            </div>
          )}
        </div>
      )}
    </div>
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
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
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
