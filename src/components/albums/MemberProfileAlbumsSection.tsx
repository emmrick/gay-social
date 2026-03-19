import { useState } from 'react';
import { FolderLock, Lock, Eye, Loader2, ImageIcon, ChevronRight, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import SharedAlbumViewer from '@/components/albums/SharedAlbumViewer';

interface MemberProfileAlbumsSectionProps {
  profileUserId: string;
  profileUsername: string;
  onStartChat?: () => void;
}

const MemberProfileAlbumsSection = ({ profileUserId, profileUsername, onStartChat }: MemberProfileAlbumsSectionProps) => {
  const { user } = useAuth();
  const { albums, isLoading, useAlbumMedia } = useAlbums(profileUserId);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [viewingAlbum, setViewingAlbum] = useState<{ id: string; name: string; expiresAt: string | null } | null>(null);

  // Check which albums the current user has active access to
  const { data: activeShares = [] } = useQuery({
    queryKey: ['album-shares-for-user', profileUserId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('album_shares')
        .select('album_id, expires_at, is_active')
        .eq('shared_by_user_id', profileUserId)
        .eq('shared_with_user_id', user.id)
        .eq('is_active', true);

      if (error) return [];
      return (data || []).filter(s => !s.expires_at || new Date(s.expires_at) > new Date());
    },
    enabled: !!user?.id && !!profileUserId,
  });

  // Check pending requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['album-access-requests-pending', profileUserId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('album_access_requests')
        .select('album_ids, status')
        .eq('requester_id', user.id)
        .eq('album_owner_id', profileUserId)
        .eq('status', 'pending');

      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id && !!profileUserId,
  });

  const pendingAlbumIds = pendingRequests.flatMap(r => r.album_ids || []);

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

  if (albums.length === 0) return null;

  const accessibleAlbumIds = new Set(activeShares.map(s => s.album_id));

  const toggleAlbumSelection = (albumId: string) => {
    setSelectedAlbumIds(prev =>
      prev.includes(albumId)
        ? prev.filter(id => id !== albumId)
        : [...prev, albumId]
    );
  };

  const handleRequestAccess = async () => {
    if (!user?.id || selectedAlbumIds.length === 0) return;
    setIsRequesting(true);

    try {
      const selectedAlbumNames = albums
        .filter(a => selectedAlbumIds.includes(a.id))
        .map(a => a.name);

      // Create access request in DB
      const { error: reqError } = await supabase
        .from('album_access_requests')
        .insert({
          requester_id: user.id,
          album_owner_id: profileUserId,
          album_ids: selectedAlbumIds,
          status: 'pending',
        });

      if (reqError) throw reqError;

      // Ensure conversation exists
      const { data: existing } = await supabase
        .from('private_conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${profileUserId}),and(user1_id.eq.${profileUserId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (!existing) {
        await supabase.from('private_conversations').insert({
          user1_id: user.id,
          user2_id: profileUserId,
        });
      }

      // Send auto message
      const albumListText = selectedAlbumNames.map(n => `"${n}"`).join(', ');
      const messageContent = JSON.stringify({
        type: 'album_access_request',
        albumIds: selectedAlbumIds,
        albumNames: selectedAlbumNames,
        requesterId: user.id,
      });

      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: profileUserId,
        content: messageContent,
        message_type: 'album_access_request',
        is_private: true,
        chat_room_id: null,
      });

      // Send notification
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.from('notifications').insert({
        user_id: profileUserId,
        type: 'album_access_request',
        title: '🔒 Demande d\'accès album',
        message: `${requesterProfile?.username || 'Un utilisateur'} souhaite accéder à ${selectedAlbumIds.length > 1 ? 'vos albums' : 'votre album'} : ${albumListText}`,
        action_url: '/',
        is_read: false,
      });

      toast.success('Demande envoyée !');
      setSelectedAlbumIds([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Error requesting album access:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsRequesting(false);
    }
  };

  const lockedAlbums = albums.filter(a => a.is_private && !accessibleAlbumIds.has(a.id));
  const unlockedAlbums = albums.filter(a => !a.is_private || accessibleAlbumIds.has(a.id));

  return (
    <>
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <FolderLock className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Albums</h3>
                <p className="text-[11px] text-muted-foreground">
                  {albums.length} album{albums.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {lockedAlbums.length > 0 && !selectMode && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 rounded-xl h-8"
                onClick={() => setSelectMode(true)}
              >
                <Lock className="w-3.5 h-3.5" />
                Demander l'accès
              </Button>
            )}
            {selectMode && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs rounded-xl h-8"
                onClick={() => { setSelectMode(false); setSelectedAlbumIds([]); }}
              >
                Annuler
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {/* Accessible albums */}
            {unlockedAlbums.map((album, index) => (
              <VisitorAlbumRow
                key={album.id}
                album={album}
                index={index}
                useAlbumMedia={useAlbumMedia}
                isAccessible={true}
                onClick={() => {
                  const share = activeShares.find(s => s.album_id === album.id);
                  setViewingAlbum({
                    id: album.id,
                    name: album.name,
                    expiresAt: share?.expires_at || null,
                  });
                }}
              />
            ))}

            {/* Locked albums */}
            {lockedAlbums.map((album, index) => {
              const isPending = pendingAlbumIds.includes(album.id);
              const isSelected = selectedAlbumIds.includes(album.id);

              return (
                <VisitorAlbumRow
                  key={album.id}
                  album={album}
                  index={unlockedAlbums.length + index}
                  useAlbumMedia={useAlbumMedia}
                  isAccessible={false}
                  isPending={isPending}
                  isSelected={isSelected}
                  selectMode={selectMode}
                  onClick={() => {
                    if (selectMode && !isPending) {
                      toggleAlbumSelection(album.id);
                    }
                  }}
                />
              );
            })}
          </div>

          {/* Request access button */}
          {selectMode && selectedAlbumIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Button
                className="w-full rounded-xl h-11 gap-2"
                onClick={handleRequestAccess}
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Demander l'accès ({selectedAlbumIds.length} album{selectedAlbumIds.length > 1 ? 's' : ''})
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Shared album viewer */}
      {viewingAlbum && (
        <SharedAlbumViewer
          albumId={viewingAlbum.id}
          albumName={viewingAlbum.name}
          expiresAt={viewingAlbum.expiresAt}
          isOpen={!!viewingAlbum}
          onClose={() => setViewingAlbum(null)}
        />
      )}
    </>
  );
};

interface VisitorAlbumRowProps {
  album: any;
  index: number;
  useAlbumMedia: (albumId: string) => any;
  isAccessible: boolean;
  isPending?: boolean;
  isSelected?: boolean;
  selectMode?: boolean;
  onClick: () => void;
}

const VisitorAlbumRow = ({ album, index, useAlbumMedia, isAccessible, isPending, isSelected, selectMode, onClick }: VisitorAlbumRowProps) => {
  const { data: media = [] } = useAlbumMedia(album.id);
  const coverImage = media[0]?.media_url;
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors group",
        isAccessible ? "hover:bg-muted/50 active:bg-muted" : "hover:bg-muted/30",
        isSelected && "bg-primary/10 border border-primary/30",
        selectMode && !isPending && "cursor-pointer",
      )}
    >
      {/* Checkbox in select mode */}
      {selectMode && !isAccessible && (
        <Checkbox
          checked={isSelected}
          disabled={isPending}
          className="flex-shrink-0"
        />
      )}

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
                "w-full h-full object-cover transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0",
                !isAccessible && "blur-lg scale-110"
              )}
            />
            {!isAccessible && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white drop-shadow-md" />
              </div>
            )}
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
          {!isAccessible && (
            <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
              <Lock className="w-2.5 h-2.5 mr-0.5" />
              Privé
            </Badge>
          )}
          {isPending && (
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 text-amber-600 border-amber-600/30">
              En attente
            </Badge>
          )}
        </div>
      </div>

      {/* Arrow for accessible */}
      {isAccessible && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        </div>
      )}
    </motion.button>
  );
};

export default MemberProfileAlbumsSection;
