import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Play, Image as ImageIcon, Video, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';

interface MediaItem {
  id: string;
  content: string;
  message_type: 'image' | 'video';
  created_at: string;
  sender_id: string;
  senderUsername: string;
  senderAvatar: string | null;
}

interface MediaGallerySheetProps {
  roomId: string;
  regionCode: string;
  isOpen: boolean;
  onClose: () => void;
}

const MediaGallerySheet = ({ roomId, regionCode, isOpen, onClose }: MediaGallerySheetProps) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');

  // Fetch all media messages for this room
  const { data: mediaItems, isLoading } = useQuery({
    queryKey: ['room-media', roomId],
    queryFn: async (): Promise<MediaItem[]> => {
      // Get regular media messages (not ephemeral - those start with http)
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, content, message_type, created_at, sender_id')
        .eq('chat_room_id', roomId)
        .in('message_type', ['image', 'video'])
        .is('deleted_at', null)
        .not('content', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!messages) return [];

      // Filter only regular media (URLs starting with http)
      const regularMedia = messages.filter(m => m.content?.startsWith('http'));

      if (regularMedia.length === 0) return [];

      // Get sender profiles
      const senderIds = [...new Set(regularMedia.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Sign avatar URLs
      const signedAvatars = new Map<string, string | null>();
      await Promise.all(
        Array.from(profileMap.entries()).map(async ([userId, profile]) => {
          const signed = await getSignedAvatarUrl(profile.avatar_url);
          signedAvatars.set(userId, signed);
        })
      );

      return regularMedia.map(m => ({
        id: m.id,
        content: m.content!,
        message_type: m.message_type as 'image' | 'video',
        created_at: m.created_at,
        sender_id: m.sender_id,
        senderUsername: profileMap.get(m.sender_id)?.username || 'Anonyme',
        senderAvatar: signedAvatars.get(m.sender_id) || null,
      }));
    },
    enabled: isOpen,
  });

  const filteredMedia = mediaItems?.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'images') return item.message_type === 'image';
    if (activeTab === 'videos') return item.message_type === 'video';
    return true;
  }) || [];

  const imageCount = mediaItems?.filter(m => m.message_type === 'image').length || 0;
  const videoCount = mediaItems?.filter(m => m.message_type === 'video').length || 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Gallery Sheet */}
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h2 className="font-display font-semibold">Médias du groupe {regionCode}</h2>
            <p className="text-xs text-muted-foreground">
              {mediaItems?.length || 0} média(s) partagé(s)
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4 grid grid-cols-3">
            <TabsTrigger value="all" className="gap-1">
              Tous
              <span className="text-xs text-muted-foreground">({mediaItems?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1">
              <ImageIcon className="w-3 h-3" />
              <span className="text-xs text-muted-foreground">({imageCount})</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1">
              <Video className="w-3 h-3" />
              <span className="text-xs text-muted-foreground">({videoCount})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 mt-0">
            <ScrollArea className="h-[calc(100vh-10rem)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Aucun média partagé</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les photos et vidéos partagées dans ce groupe apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 p-2">
                  {filteredMedia.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedMedia(item)}
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted group"
                    >
                      {item.message_type === 'image' ? (
                        <img
                          src={item.content}
                          alt="Media"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <video
                            src={item.content}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-foreground fill-current ml-0.5" />
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Media viewer dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          {selectedMedia && (
            <div className="relative w-full h-full flex flex-col">
              {/* Media */}
              <div className="flex-1 flex items-center justify-center min-h-[50vh] p-4">
                {selectedMedia.message_type === 'image' ? (
                  <img
                    src={selectedMedia.content}
                    alt="Media"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                ) : (
                  <video
                    src={selectedMedia.content}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    controls
                    autoPlay
                  />
                )}
              </div>

              {/* Info footer */}
              <div className="p-4 bg-black/50 backdrop-blur-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                    {selectedMedia.senderAvatar ? (
                      <img
                        src={selectedMedia.senderAvatar}
                        alt={selectedMedia.senderUsername}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedMedia.senderUsername.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{selectedMedia.senderUsername}</p>
                    <p className="text-xs text-white/60 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(selectedMedia.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaGallerySheet;
