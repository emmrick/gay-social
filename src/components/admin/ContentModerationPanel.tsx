import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';
import {
  MessageSquare,
  Image,
  Folder,
  Search,
  Loader2,
  Trash2,
  Eye,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  ChevronDown,
  X,
  Check,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import ModerationSummaryDialog, { ModerationSummaryItem } from './ModerationSummaryDialog';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  chat_room_id: string | null;
  content: string | null;
  message_type: string;
  created_at: string;
  is_private: boolean | null;
  deleted_at: string | null;
  deleted_by: string | null;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  key: string;
  userA: { id: string; username: string; avatar_url: string | null };
  userB: { id: string; username: string; avatar_url: string | null };
  lastMessage: Message;
  messageCount: number;
}

interface ProfilePhoto {
  id: string;
  user_id: string;
  photo_url: string;
  is_primary: boolean;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Album {
  id: string;
  user_id: string;
  name: string;
  is_private: boolean;
  created_at: string;
  media_count: number;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const useRecentConversations = (search: string) => {
  return useQuery({
    queryKey: ['admin-conversations', search],
    queryFn: async (): Promise<Conversation[]> => {
      let query = supabase
        .from('messages')
        .select('id, sender_id, recipient_id, chat_room_id, content, message_type, created_at, is_private, deleted_at, deleted_by')
        .eq('is_private', true)
        .not('recipient_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (search.trim()) {
        query = query.ilike('content', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by user pair (canonical key = sorted ids)
      const groups = new Map<string, Message[]>();
      for (const msg of (data || []) as Message[]) {
        if (!msg.recipient_id) continue;
        const [a, b] = [msg.sender_id, msg.recipient_id].sort();
        const key = `${a}__${b}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(msg);
      }

      // Resolve profiles
      const userIds = new Set<string>();
      groups.forEach((_, key) => {
        const [a, b] = key.split('__');
        userIds.add(a);
        userIds.add(b);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', [...userIds]);

      const signedMap = new Map<string, string | null>();
      await Promise.all(
        (profiles || []).map(async (p) => {
          const url = await getSignedAvatarUrl(p.avatar_url);
          signedMap.set(p.user_id, url);
        })
      );

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { id: p.user_id, username: p.username, avatar_url: signedMap.get(p.user_id) ?? null }])
      );

      const conversations: Conversation[] = [];
      groups.forEach((msgs, key) => {
        const [a, b] = key.split('__');
        // already sorted desc by created_at because data is sorted desc; first is latest
        const lastMessage = msgs[0];
        conversations.push({
          key,
          userA: profileMap.get(a) || { id: a, username: 'Inconnu', avatar_url: null },
          userB: profileMap.get(b) || { id: b, username: 'Inconnu', avatar_url: null },
          lastMessage,
          messageCount: msgs.length,
        });
      });

      // Sort by latest message desc
      conversations.sort(
        (x, y) => new Date(y.lastMessage.created_at).getTime() - new Date(x.lastMessage.created_at).getTime()
      );
      return conversations;
    },
    refetchInterval: 15000,
  });
};

const useConversationMessages = (userA?: string, userB?: string) => {
  return useQuery({
    queryKey: ['admin-conversation-thread', userA, userB],
    queryFn: async (): Promise<Message[]> => {
      if (!userA || !userB) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, chat_room_id, content, message_type, created_at, is_private, deleted_at, deleted_by')
        .eq('is_private', true)
        .or(`and(sender_id.eq.${userA},recipient_id.eq.${userB}),and(sender_id.eq.${userB},recipient_id.eq.${userA})`)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;

      const userIds = [userA, userB];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const signedMap = new Map<string, string | null>();
      await Promise.all(
        (profiles || []).map(async (p) => {
          const url = await getSignedAvatarUrl(p.avatar_url);
          signedMap.set(p.user_id, url);
        })
      );
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { username: p.username, avatar_url: signedMap.get(p.user_id) ?? null }])
      );

      return ((data || []) as Message[]).map(m => ({ ...m, sender: profileMap.get(m.sender_id) }));
    },
    enabled: !!userA && !!userB,
    refetchInterval: 10000,
  });
};

// Fetch reported user IDs to filter content
const useReportedUsers = () => {
  return useQuery({
    queryKey: ['admin-reported-users'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select('reported_user_id')
        .in('status', ['pending', 'reviewed']);

      if (error) throw error;

      // Get unique user IDs
      return [...new Set(data?.map(r => r.reported_user_id) || [])];
    },
  });
};

const useProfilePhotos = (reportedUserIds: string[]) => {
  return useQuery({
    queryKey: ['admin-profile-photos', reportedUserIds],
    queryFn: async (): Promise<(ProfilePhoto & { signed_url?: string })[]> => {
      if (reportedUserIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profile_photos')
        .select('*')
        .in('user_id', reportedUserIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Sign all photo URLs (private bucket)
      const resolved = await Promise.all(
        (data || []).map(async (photo) => {
          const signed = await getSignedAvatarUrl(photo.photo_url);
          return {
            ...photo,
            signed_url: signed || photo.photo_url,
            profile: profileMap.get(photo.user_id),
          };
        })
      );

      return resolved;
    },
    enabled: reportedUserIds.length > 0,
  });
};

const useAlbums = (reportedUserIds: string[]) => {
  return useQuery({
    queryKey: ['admin-albums', reportedUserIds],
    queryFn: async (): Promise<Album[]> => {
      if (reportedUserIds.length === 0) return [];

      const { data: albums, error } = await supabase
        .from('user_albums')
        .select('*')
        .in('user_id', reportedUserIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch profiles and media counts
      const userIds = [...new Set(albums?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const albumIds = albums?.map(a => a.id) || [];
      const { data: mediaCounts } = await supabase
        .from('album_media')
        .select('album_id')
        .in('album_id', albumIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const countMap = new Map<string, number>();
      mediaCounts?.forEach(m => {
        countMap.set(m.album_id, (countMap.get(m.album_id) || 0) + 1);
      });

      return (albums || []).map(album => ({
        ...album,
        media_count: countMap.get(album.id) || 0,
        profile: profileMap.get(album.user_id),
      }));
    },
    enabled: reportedUserIds.length > 0,
  });
};

const ContentModerationPanel = () => {
  const [activeTab, setActiveTab] = useState('pending-photos');
  const [messageSearch, setMessageSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; label: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [summaryItem, setSummaryItem] = useState<ModerationSummaryItem | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: activeTask } = useActiveTask();
  const { data: reportedUserIds = [], isLoading: reportedUsersLoading, refetch: refetchReportedUsers } = useReportedUsers();
  const { data: conversations, isLoading: messagesLoading, refetch: refetchMessages } = useRecentConversations(messageSearch);
  const [openConversation, setOpenConversation] = useState<Conversation | null>(null);
  const { data: threadMessages, isLoading: threadLoading } = useConversationMessages(
    openConversation?.userA.id,
    openConversation?.userB.id,
  );
  const { data: photos, isLoading: photosLoading, refetch: refetchPhotos } = useProfilePhotos(reportedUserIds);
  const { data: albums, isLoading: albumsLoading, refetch: refetchAlbums } = useAlbums(reportedUserIds);

  // Pending photo approvals
  const { data: pendingPhotos = [], isLoading: pendingPhotosLoading, refetch: refetchPendingPhotos } = useQuery({
    queryKey: ['admin-pending-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Resolve signed URLs + get usernames
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const resolved = await Promise.all(
        (data || []).map(async (photo: any) => {
          const signedUrl = await getSignedAvatarUrl(photo.photo_url);
          return {
            ...photo,
            signed_url: signedUrl || photo.photo_url,
            profile: profileMap.get(photo.user_id) || null,
          };
        })
      );
      return resolved;
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // Auto-navigate to pending photos tab when a photo_review task is active
  useEffect(() => {
    if (activeTask?.task_type === 'content_moderation' && (activeTask.metadata as any)?.type === 'photo_review') {
      setActiveTab('pending-photos');
    }
  }, [activeTask]);

  const approvePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from('profile_photos')
        .update({ status: 'approved' } as any)
        .eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-photos'] });
      toast.success('Photo approuvée');
    },
    onError: () => toast.error('Erreur'),
  });

  const rejectPhoto = useMutation({
    mutationFn: async ({ photoId, reason }: { photoId: string; reason: string }) => {
      const { error } = await supabase
        .from('profile_photos')
        .update({ status: 'rejected', rejection_reason: reason } as any)
        .eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-photos'] });
      toast.success('Photo refusée');
    },
    onError: () => toast.error('Erreur'),
  });

  const photosLoaderState = reportedUsersLoading || photosLoading;
  const albumsLoaderState = reportedUsersLoading || albumsLoading;

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from('profile_photos')
        .delete()
        .eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile-photos'] });
      toast.success('Photo supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deleteAlbum = useMutation({
    mutationFn: async (albumId: string) => {
      // First delete album media
      await supabase.from('album_media').delete().eq('album_id', albumId);
      // Then delete album shares
      await supabase.from('album_shares').delete().eq('album_id', albumId);
      // Finally delete album
      const { error } = await supabase
        .from('user_albums')
        .delete()
        .eq('id', albumId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-albums'] });
      toast.success('Album supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'message') {
      deleteMessage.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'photo') {
      deletePhoto.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'album') {
      deleteAlbum.mutate(itemToDelete.id);
    }

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const confirmDelete = (type: string, id: string, label: string) => {
    setItemToDelete({ type, id, label });
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Modération de contenu</h2>
          <p className="text-sm text-muted-foreground">
            Gérer les messages, photos et albums
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full h-auto">
          <TabsTrigger value="pending-photos" className="gap-1 sm:gap-2 relative text-xs sm:text-sm px-2 py-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">Approbation</span>
            {pendingPhotos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingPhotos.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Image className="w-4 h-4 shrink-0" />
            <span className="truncate">Photos</span>
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Folder className="w-4 h-4 shrink-0" />
            <span className="truncate">Albums</span>
          </TabsTrigger>
        </TabsList>

        {/* Pending Photo Approvals Tab */}
        <TabsContent value="pending-photos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Photos en attente d'approbation
            </p>
            <Button variant="ghost" size="icon" onClick={() => refetchPendingPhotos()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            {pendingPhotosLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : pendingPhotos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune photo en attente</p>
                <p className="text-sm mt-1">Toutes les photos ont été traitées</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pendingPhotos.map((photo: any) => (
                  <div key={photo.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="aspect-square bg-secondary relative">
                      <img
                        src={photo.signed_url}
                        alt=""
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewImage(photo.signed_url)}
                      />
                      <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px]">
                        En attente
                      </Badge>
                    </div>
                    <div
                      className="p-3 space-y-2 cursor-pointer hover:bg-muted/30"
                      onClick={() => setSummaryItem({
                        kind: 'pending-photo',
                        id: photo.id,
                        userId: photo.user_id,
                        username: photo.profile?.username,
                        avatarUrl: photo.profile?.avatar_url ?? null,
                        photoUrl: photo.signed_url,
                        createdAt: photo.created_at,
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{photo.profile?.username || 'Inconnu'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true, locale: fr })}
                      </p>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => approvePhoto.mutate(photo.id)}
                          disabled={approvePhoto.isPending}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 gap-1"
                          onClick={() => rejectPhoto.mutate({ photoId: photo.id, reason: 'Photo non conforme aux règles' })}
                          disabled={rejectPhoto.isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Messages Tab — grouped conversations */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les conversations..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetchMessages()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            {messagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune conversation trouvée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const last = conv.lastMessage;
                  const lastSender = last.sender_id === conv.userA.id ? conv.userA : conv.userB;
                  return (
                    <div
                      key={conv.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenConversation(conv)}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex -space-x-3 shrink-0">
                          <Avatar className="w-9 h-9 border-2 border-background">
                            <AvatarImage src={conv.userA.avatar_url || ''} />
                            <AvatarFallback>{conv.userA.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                          <Avatar className="w-9 h-9 border-2 border-background">
                            <AvatarImage src={conv.userB.avatar_url || ''} />
                            <AvatarFallback>{conv.userB.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {conv.userA.username} ↔ {conv.userB.username}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{conv.messageCount} msg</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(last.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 truncate ${last.deleted_at ? 'text-orange-500/80 italic' : 'text-muted-foreground'}`}>
                            <span className="font-medium">{lastSender.username}: </span>
                            {last.content || `[${last.message_type}]`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="photos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Seules les photos des utilisateurs signalés sont affichées
            </p>
            <Button variant="ghost" size="icon" onClick={() => { refetchReportedUsers(); refetchPhotos(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {photosLoaderState ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : reportedUserIds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucun utilisateur signalé</p>
                <p className="text-sm mt-1">Les photos ne sont visibles que lorsqu'un utilisateur est signalé</p>
              </div>
            ) : photos?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune photo trouvée</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos?.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative cursor-pointer"
                    onClick={() => setSummaryItem({
                      kind: 'reported-photo',
                      id: photo.id,
                      userId: photo.user_id,
                      username: photo.profile?.username,
                      avatarUrl: photo.profile?.avatar_url ?? null,
                      photoUrl: photo.signed_url || photo.photo_url,
                      isPrimary: photo.is_primary,
                      createdAt: photo.created_at,
                    })}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                      <img
                        src={photo.signed_url || photo.photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                      <p className="text-white text-xs font-medium">{photo.profile?.username}</p>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => setPreviewImage(photo.signed_url || photo.photo_url)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => confirmDelete('photo', photo.id, 'cette photo')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {photo.is_primary && (
                      <Badge className="absolute top-2 left-2 text-xs">Principal</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Albums Tab */}
        <TabsContent value="albums" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Seuls les albums des utilisateurs signalés sont affichés
            </p>
            <Button variant="ghost" size="icon" onClick={() => { refetchReportedUsers(); refetchAlbums(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {albumsLoaderState ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : reportedUserIds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucun utilisateur signalé</p>
                <p className="text-sm mt-1">Les albums ne sont visibles que lorsqu'un utilisateur est signalé</p>
              </div>
            ) : albums?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun album trouvé pour les utilisateurs signalés</p>
              </div>
            ) : (
              <div className="space-y-2">
                {albums?.map((album) => (
                  <div
                    key={album.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSummaryItem({
                      kind: 'album',
                      id: album.id,
                      userId: album.user_id,
                      username: album.profile?.username,
                      avatarUrl: album.profile?.avatar_url ?? null,
                      name: album.name,
                      isPrivate: album.is_private,
                      mediaCount: album.media_count,
                      createdAt: album.created_at,
                    })}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Folder className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{album.name}</span>
                          {album.is_private && (
                            <Badge variant="secondary" className="text-xs">Privé</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {album.profile?.username}
                          </span>
                          <span>{album.media_count} média(s)</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(album.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); confirmDelete('album', album.id, album.name); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {itemToDelete?.label} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aperçu</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img src={previewImage} alt="" className="w-full rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Moderation Summary Dialog */}
      <ModerationSummaryDialog
        item={summaryItem}
        onClose={() => setSummaryItem(null)}
        onPreviewImage={(url) => setPreviewImage(url)}
        onApprove={(id) => approvePhoto.mutate(id)}
        onReject={(id) => rejectPhoto.mutate({ photoId: id, reason: 'Photo non conforme aux règles' })}
        onDelete={(it) => {
          if (it.kind === 'message') confirmDelete('message', it.id, it.content || 'message');
          else if (it.kind === 'reported-photo') confirmDelete('photo', it.id, 'cette photo');
          else if (it.kind === 'album') confirmDelete('album', it.id, it.name);
        }}
      />

      {/* Conversation Thread Dialog */}
      <Dialog open={!!openConversation} onOpenChange={(open) => !open && setOpenConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3 text-base">
              {openConversation && (
                <>
                  <div className="flex -space-x-2">
                    <Avatar className="w-8 h-8 border-2 border-background">
                      <AvatarImage src={openConversation.userA.avatar_url || ''} />
                      <AvatarFallback>{openConversation.userA.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-background">
                      <AvatarImage src={openConversation.userB.avatar_url || ''} />
                      <AvatarFallback>{openConversation.userB.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <span>
                    {openConversation.userA.username} ↔ {openConversation.userB.username}
                  </span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Fil de conversation complet</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4">
            {threadLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !threadMessages || threadMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucun message
              </div>
            ) : (
              <div className="space-y-2">
                {threadMessages.map((msg) => {
                  const isUserA = msg.sender_id === openConversation?.userA.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isUserA ? 'justify-start' : 'justify-end'}`}
                    >
                      {isUserA && (
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarImage src={msg.sender?.avatar_url || ''} />
                          <AvatarFallback>{msg.sender?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          msg.deleted_at
                            ? 'bg-orange-500/10 border border-orange-500/30 italic text-orange-500/80'
                            : isUserA
                              ? 'bg-muted text-foreground'
                              : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <div className="text-[10px] font-medium opacity-70 mb-0.5">
                          {msg.sender?.username || 'Inconnu'}
                        </div>
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content || `[${msg.message_type}]`}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] opacity-60">
                            {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: fr })}
                          </span>
                          {msg.deleted_at && (
                            <Badge variant="secondary" className="text-[9px] py-0 h-4">
                              Supprimé
                            </Badge>
                          )}
                          {!msg.deleted_at && (
                            <button
                              type="button"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => confirmDelete('message', msg.id, msg.content || 'message')}
                              title="Supprimer le message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {!isUserA && (
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarImage src={msg.sender?.avatar_url || ''} />
                          <AvatarFallback>{msg.sender?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentModerationPanel;
