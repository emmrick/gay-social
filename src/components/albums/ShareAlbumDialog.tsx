import { useState } from 'react';
import { Share2, Clock, Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAlbums } from '@/hooks/useAlbums';
import { toast } from 'sonner';

interface ShareAlbumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
}

const ShareAlbumDialog = ({ isOpen, onClose, recipientId, recipientName }: ShareAlbumDialogProps) => {
  const { albums, shareAlbum } = useAlbums();
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [duration, setDuration] = useState<'unlimited' | '24h' | '7d' | '30d'>('unlimited');

  const handleShare = async () => {
    if (!selectedAlbum) {
      toast.error('Veuillez sélectionner un album');
      return;
    }

    await shareAlbum.mutateAsync({
      albumId: selectedAlbum,
      sharedWithUserId: recipientId,
      duration,
    });

    onClose();
    setSelectedAlbum('');
    setDuration('unlimited');
  };

  const durationLabels: Record<string, string> = {
    'unlimited': 'Illimité',
    '24h': '24 heures',
    '7d': '7 jours',
    '30d': '30 jours',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Partager un album avec {recipientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Album selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Album à partager</label>
            <Select value={selectedAlbum} onValueChange={setSelectedAlbum}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un album" />
              </SelectTrigger>
              <SelectContent>
                {albums.map((album) => (
                  <SelectItem key={album.id} value={album.id}>
                    {album.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {albums.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Vous n'avez aucun album. Créez-en un dans votre profil.
              </p>
            )}
          </div>

          {/* Duration selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Durée du partage
            </label>
            <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">Illimité</SelectItem>
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-1" />
              Annuler
            </Button>
            <Button 
              onClick={handleShare} 
              className="flex-1"
              disabled={!selectedAlbum || shareAlbum.isPending}
            >
              {shareAlbum.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Partager
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareAlbumDialog;
