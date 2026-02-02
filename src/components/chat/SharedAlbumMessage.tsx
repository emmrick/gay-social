import { useState, useEffect } from 'react';
import { FolderLock, Eye, Clock, StopCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SharedAlbumViewer from '@/components/albums/SharedAlbumViewer';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const [showViewer, setShowViewer] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);

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

  // Check if share is still active
  const { data: shareData } = useQuery({
    queryKey: ['album-share-status', shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_shares')
        .select('is_active')
        .eq('id', shareId)
        .single();

      if (error) return { is_active: false };
      return data;
    },
    enabled: !!shareId,
  });

  // Real-time subscription for share status changes
  useEffect(() => {
    if (!shareId) return;

    const channel = supabase
      .channel(`share-status-${shareId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'album_shares',
          filter: `id=eq.${shareId}`,
        },
        (payload) => {
          // Invalidate the query to refresh the status
          queryClient.invalidateQueries({ queryKey: ['album-share-status', shareId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareId, queryClient]);

  // Stop sharing mutation
  const stopSharing = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('album_shares')
        .update({ is_active: false })
        .eq('id', shareId)
        .eq('shared_by_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album-shares'] });
      queryClient.invalidateQueries({ queryKey: ['album-share-status', shareId] });
      toast.success('Partage arrêté');
      setShowStopDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur');
    },
  });

  // Check if expired or stopped
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const isStopped = shareData && !shareData.is_active;

  if (isExpired || isStopped) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 text-muted-foreground">
        <FolderLock className="w-5 h-5" />
        <span className="text-sm">{isStopped ? 'Partage arrêté' : 'Album expiré'}</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <button
          onClick={() => setShowViewer(true)}
          className={`flex items-center gap-3 p-4 rounded-xl transition-all w-full ${
            isOwn
              ? 'bg-primary/20 hover:bg-primary/30 cursor-pointer'
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
              {' • Appuie pour voir'}
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

        {/* Stop sharing button - only for owner */}
        {isOwn && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
            onClick={() => setShowStopDialog(true)}
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Arrêter le partage
          </Button>
        )}
      </div>

      {/* Album Viewer Dialog */}
      <SharedAlbumViewer
        albumId={albumId}
        albumName={albumName}
        expiresAt={expiresAt}
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
      />

      {/* Stop sharing confirmation */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arrêter le partage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette personne ne pourra plus accéder à votre album "{albumName}". 
              Vous pourrez le repartager à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopSharing.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => stopSharing.mutate()}
              disabled={stopSharing.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {stopSharing.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <StopCircle className="w-4 h-4 mr-2" />
              )}
              Arrêter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SharedAlbumMessage;
