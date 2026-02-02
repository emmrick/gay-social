import { useState, useCallback, useRef, useEffect } from 'react';
import { FolderLock, Clock, Eye, X, ShieldX, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useAuth } from '@/contexts/AuthContext';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';

interface SharedAlbumViewerProps {
  albumId: string;
  albumName: string;
  expiresAt: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to extract storage path from URL and create signed URL
const getSignedUrl = async (mediaUrl: string): Promise<string> => {
  // Extract the path from the URL
  // URL format can be:
  // - Public: https://xxx.supabase.co/storage/v1/object/public/media/userId/albumId/filename
  // - Authenticated: https://xxx.supabase.co/storage/v1/object/authenticated/media/userId/albumId/filename
  // - Signed: already has token parameter
  
  // If already a signed URL, return as-is
  if (mediaUrl.includes('token=')) {
    return mediaUrl;
  }
  
  // Try to extract path from various URL formats
  let path: string | null = null;
  
  // Match public or authenticated bucket URLs
  const publicMatch = mediaUrl.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
  const authMatch = mediaUrl.match(/\/storage\/v1\/object\/authenticated\/media\/(.+)$/);
  const signMatch = mediaUrl.match(/\/storage\/v1\/object\/sign\/media\/(.+?)(\?|$)/);
  
  if (publicMatch) {
    path = publicMatch[1];
  } else if (authMatch) {
    path = authMatch[1];
  } else if (signMatch) {
    path = signMatch[1];
  }
  
  if (!path) {
    console.error('Could not extract path from media URL:', mediaUrl);
    return mediaUrl;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(path, 3600); // 1 hour
    
    if (error) {
      console.error('Failed to create signed URL:', error);
      return mediaUrl;
    }
    
    if (!data?.signedUrl) {
      console.error('No signed URL returned');
      return mediaUrl;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Error creating signed URL:', err);
    return mediaUrl;
  }
};

const SharedAlbumViewer = ({ albumId, albumName, expiresAt, isOpen, onClose }: SharedAlbumViewerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [shareRevoked, setShareRevoked] = useState(false);
  
  // Embla carousel for fullscreen swipe navigation
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    dragFree: false,
    containScroll: 'trimSnaps',
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Update carousel state
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Initialize carousel when opening fullscreen
  useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Jump to selected slide when opening fullscreen
  useEffect(() => {
    if (fullscreenIndex !== null && emblaApi) {
      emblaApi.scrollTo(fullscreenIndex, true);
    }
  }, [fullscreenIndex, emblaApi]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);
  const notificationSentRef = useRef(false);
  
  const { 
    isSuspended, 
    isBlocked, 
    getSuspensionTimeLeft, 
    preventContextMenu, 
    preventDrag 
  } = useScreenshotProtection();

  // Subscribe to album_shares changes in real-time
  useEffect(() => {
    if (!isOpen || !albumId || !user?.id) return;

    const channel = supabase
      .channel(`album-share-${albumId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'album_shares',
          filter: `album_id=eq.${albumId}`,
        },
        (payload) => {
          const newRecord = payload.new as { is_active: boolean; shared_with_user_id: string };
          // If sharing was stopped for this user
          if (newRecord.shared_with_user_id === user.id && !newRecord.is_active) {
            setShareRevoked(true);
            setFullscreenIndex(null);
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['album-share-status'] });
            queryClient.invalidateQueries({ queryKey: ['shared-albums'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, albumId, user?.id, queryClient]);

  // Reset shareRevoked state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShareRevoked(false);
    }
  }, [isOpen]);

  // Fetch album owner
  const { data: albumOwner } = useQuery({
    queryKey: ['album-owner', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_albums')
        .select('user_id')
        .eq('id', albumId)
        .single();

      if (error) throw error;
      return data?.user_id;
    },
    enabled: isOpen && !!albumId,
  });

  // Mutation to notify album owner of screenshot attempt
  const notifyOwnerMutation = useMutation({
    mutationFn: async () => {
      if (!albumOwner || !user || albumOwner === user.id || notificationSentRef.current) {
        return;
      }
      
      notificationSentRef.current = true;

      const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      const viewerName = viewerProfile?.username || 'Un utilisateur';

      await supabase.from('notifications').insert({
        user_id: albumOwner,
        type: 'screenshot_attempt',
        title: '🛡️ Tentative de capture détectée',
        message: `${viewerName} a tenté de capturer votre album "${albumName}". Rassurez-vous, nous avons pris des mesures pour protéger votre contenu : l'écran a été masqué et l'utilisateur a été sanctionné.`,
        action_url: '/profile',
      });
    },
  });

  // Notify owner when screenshot is blocked
  const handleScreenshotDetected = useCallback(() => {
    notifyOwnerMutation.mutate();
  }, [notifyOwnerMutation]);

  // Watch for isBlocked changes to notify owner
  const prevBlockedRef = useRef(false);
  if (isBlocked && !prevBlockedRef.current) {
    handleScreenshotDetected();
  }
  prevBlockedRef.current = isBlocked;

  // Fetch album media with signed URLs
  const { data: media = [], isLoading, error: mediaError } = useQuery({
    queryKey: ['shared-album-media', albumId],
    queryFn: async () => {
      console.log('Fetching album media for albumId:', albumId);
      
      const { data, error } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching album media:', error);
        throw error;
      }
      
      console.log('Album media fetched:', data?.length || 0, 'items');
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Generate signed URLs for all media
      const mediaWithSignedUrls = await Promise.all(
        data.map(async (item) => {
          const signed_url = await getSignedUrl(item.media_url);
          console.log('Generated signed URL for:', item.id, signed_url ? 'success' : 'failed');
          return {
            ...item,
            signed_url,
          };
        })
      );
      
      return mediaWithSignedUrls;
    },
    enabled: isOpen && !!albumId && !shareRevoked,
  });

  // Log any query errors
  if (mediaError) {
    console.error('Media query error:', mediaError);
  }

  // Show revoked access screen
  if (shareRevoked) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold">Accès révoqué</h3>
            <p className="text-sm text-muted-foreground">
              Le propriétaire a arrêté le partage de cet album. Vous n'avez plus accès à son contenu.
            </p>
            <Button onClick={onClose} variant="outline">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderLock className="w-6 h-6 text-primary" />
            {albumName}
          </DialogTitle>
          {expiresAt && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Accès expire {formatDistanceToNow(new Date(expiresAt), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Cet album est vide</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative p-1">
              {/* Screenshot block overlay */}
              {isBlocked && (
                <div className="absolute inset-0 z-50 bg-black rounded-xl flex items-center justify-center">
                  <p className="text-white text-lg font-medium">Capture détectée</p>
                </div>
              )}
              {media.map((item, index) => (
                <div 
                  key={item.id} 
                  className="aspect-square rounded-xl overflow-hidden bg-secondary cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => setFullscreenIndex(index)}
                  onContextMenu={preventContextMenu}
                  onDragStart={preventDrag}
                >
                  {item.media_type === 'image' ? (
                    <img 
                      src={item.signed_url} 
                      alt="" 
                      className="w-full h-full object-cover select-none pointer-events-none"
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

        {/* Fullscreen media viewer with swipe navigation */}
        {fullscreenIndex !== null && media.length > 0 && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
            onContextMenu={preventContextMenu}
          >
            {/* Screenshot block overlay in fullscreen */}
            {isBlocked && (
              <div className="absolute inset-0 z-[101] bg-black flex items-center justify-center">
                <p className="text-white text-lg font-medium">Capture détectée</p>
              </div>
            )}
            
            {/* Header with close button and counter */}
            <div className="absolute top-0 left-0 right-0 z-[102] flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="text-white text-sm font-medium">
                {currentSlide + 1} / {media.length}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setFullscreenIndex(null)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Carousel container */}
            <div className="flex-1 overflow-hidden" ref={emblaRef}>
              <div className="flex h-full">
                {media.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.media_type === 'image' ? (
                      <img 
                        src={item.signed_url} 
                        alt="" 
                        className="max-w-full max-h-full object-contain select-none"
                        onContextMenu={preventContextMenu}
                        onDragStart={preventDrag}
                        draggable={false}
                      />
                    ) : (
                      <video 
                        src={item.signed_url} 
                        className="max-w-full max-h-full select-none"
                        controls
                        autoPlay={index === currentSlide}
                        onContextMenu={preventContextMenu}
                        controlsList="nodownload"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation buttons - hidden on mobile, visible on desktop */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-[102] text-white hover:bg-white/20 h-12 w-12 rounded-full hidden sm:flex",
                !canScrollPrev && "opacity-30 pointer-events-none"
              )}
              onClick={scrollPrev}
              disabled={!canScrollPrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-[102] text-white hover:bg-white/20 h-12 w-12 rounded-full hidden sm:flex",
                !canScrollNext && "opacity-30 pointer-events-none"
              )}
              onClick={scrollNext}
              disabled={!canScrollNext}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>

            {/* Dot indicators */}
            {media.length > 1 && media.length <= 10 && (
              <div className="absolute bottom-6 left-0 right-0 z-[102] flex justify-center gap-2">
                {media.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentSlide 
                        ? "bg-white w-4" 
                        : "bg-white/40 hover:bg-white/60"
                    )}
                    onClick={() => emblaApi?.scrollTo(index)}
                  />
                ))}
              </div>
            )}

            {/* Swipe hint for mobile - only shown briefly */}
            <div className="absolute bottom-16 left-0 right-0 z-[102] flex justify-center sm:hidden pointer-events-none">
              <p className="text-white/60 text-xs animate-fade-in">
                ← Glissez pour naviguer →
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SharedAlbumViewer;
