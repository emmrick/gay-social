import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdBanner from '@/components/ads/AdBanner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useConversationStatus } from '@/hooks/useConversationStatus';
import LiveOnlineDot from '@/components/presence/LiveOnlineDot';
import { usePendingEphemeralSnaps } from '@/hooks/usePendingEphemeralSnaps';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MessageCircle, MoreVertical, Archive, Trash2, ArchiveRestore, Mail, MailOpen, Timer, Camera, Video, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConversationAutoDeleteSheet from './ConversationAutoDeleteSheet';

type FilterType = 'all' | 'unread';

interface PrivateChatListProps {
  onSelectConversation: (userId: string, pendingSnap?: boolean) => void;
  selectedUserId: string | null;
  showArchived?: boolean;
}

const PrivateChatList = ({ onSelectConversation, selectedUserId, showArchived = false }: PrivateChatListProps) => {
  const { conversations, archivedConversations, isLoading } = usePrivateConversations();
  const { getUnreadCount, markAsRead, markAsUnread } = useUnreadMessages();
  const { archiveConversation, unarchiveConversation, deleteConversation } = useConversationStatus();
  const { data: pendingSnaps } = usePendingEphemeralSnaps();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [autoDeleteSheet, setAutoDeleteSheet] = useState<{ conversationId: string; username: string } | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasLongPressRef = useRef(false);

  const handleLongPressStart = useCallback((conversationId: string, username: string) => {
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      setAutoDeleteSheet({ conversationId, username });
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const baseConversations = showArchived ? archivedConversations : conversations;

  // Apply filters
  const displayConversations = baseConversations.filter((conv) => {
    if (filter === 'unread' && getUnreadCount(conv.otherUser.user_id) === 0) return false;
    if (searchQuery.trim()) {
      return conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleArchive = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    archiveConversation.mutate(conversationId);
  };

  const handleUnarchive = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    unarchiveConversation.mutate(conversationId);
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleMarkAsRead = (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation();
    markAsRead.mutate(partnerId);
  };

  const handleMarkAsUnread = (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation();
    markAsUnread.mutate(partnerId);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation.mutate(conversationToDelete);
      setConversationToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getMessagePreview = (conv: typeof displayConversations[0]) => {
    if (!conv.lastMessage) return 'Nouvelle conversation';
    const { message_type, content } = conv.lastMessage;
    if (message_type === 'image') return '📷 Photo';
    if (message_type === 'video') return '🎥 Vidéo';
    if (message_type === 'album_share') return '📁 Album partagé';
    if (message_type === 'album_access_request') return '🔒 Demande d\'accès album';
    if (message_type === 'credit_gift') return '🎁 Cadeau de crédits';
    if (content && content.length > 45) return content.substring(0, 45) + '…';
    return content || 'Nouvelle conversation';
  };

  const totalUnread = baseConversations.reduce((sum, conv) => sum + getUnreadCount(conv.otherUser.user_id), 0);

  if (isLoading) {
    return (
      <div className="px-3 py-3 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3.5 rounded-2xl">
            <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Search & Filters bar */}
      <div className="px-3 pt-2 pb-1 space-y-2">
        {/* Search toggle + filter chips */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {showSearch ? (
              <motion.div
                key="search-input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 pr-8 h-9 rounded-xl bg-secondary border-none text-sm"
                  autoFocus
                />
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="filter-chips"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 flex-1"
              >
                <button
                  onClick={() => setFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                    filter === 'all'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1",
                    filter === 'unread'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  Non lus
                  {totalUnread > 0 && (
                    <span className={cn(
                      "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      filter === 'unread'
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    )}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!showSearch && (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {displayConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5"
          >
            {showArchived ? (
              <Archive className="w-9 h-9 text-primary/60" />
            ) : searchQuery ? (
              <Search className="w-9 h-9 text-primary/60" />
            ) : filter === 'unread' ? (
              <MailOpen className="w-9 h-9 text-primary/60" />
            ) : (
              <MessageCircle className="w-9 h-9 text-primary/60" />
            )}
          </motion.div>
          <h3 className="font-display font-semibold text-foreground text-lg mb-1.5">
            {searchQuery
              ? 'Aucun résultat'
              : showArchived
              ? 'Aucune archive'
              : filter === 'unread'
              ? 'Tout est lu !'
              : 'Aucune conversation'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
            {searchQuery
              ? `Aucune conversation ne correspond à « ${searchQuery} »`
              : showArchived
              ? 'Vos conversations archivées apparaîtront ici'
              : filter === 'unread'
              ? 'Vous avez lu tous vos messages'
              : 'Démarrez une conversation pour commencer à discuter'}
          </p>
        </div>
      ) : (
        <div className="px-2 py-1">
          <AnimatePresence mode="popLayout">
            {displayConversations.map((conv) => {
              const unreadCount = getUnreadCount(conv.otherUser.user_id);
              const hasUnread = unreadCount > 0;
              const isSelected = selectedUserId === conv.otherUser.user_id;
              const snap = pendingSnaps?.get(conv.otherUser.user_id);
              const hasSnap = !!snap;
              const isSnapPhoto = snap?.mediaType === 'image';

              const snapColorClass = isSnapPhoto ? 'text-teal-500' : 'text-orange-500';
              const snapRingClass = isSnapPhoto ? 'ring-teal-500/50' : 'ring-orange-500/50';

              return (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    if (!wasLongPressRef.current) {
                      onSelectConversation(conv.otherUser.user_id, hasSnap);
                    }
                  }}
                  onPointerDown={() => handleLongPressStart(conv.id, conv.otherUser.username)}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3.5 cursor-pointer transition-all duration-200 select-none rounded-2xl mx-1 my-0.5",
                    "hover:bg-secondary/70 active:scale-[0.98]",
                    isSelected && "bg-primary/8 ring-1 ring-primary/15",
                    hasSnap && !isSelected && (isSnapPhoto ? "bg-teal-500/[0.06]" : "bg-orange-500/[0.06]"),
                    hasUnread && !hasSnap && !isSelected && "bg-primary/[0.04]"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-14 h-14 rounded-full overflow-hidden transition-shadow duration-200",
                      hasSnap && `ring-2 ${snapRingClass} ring-offset-2 ring-offset-background`,
                      hasUnread && !hasSnap && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    )}>
                      {conv.otherUser.avatar_url ? (
                        <img
                          src={conv.otherUser.avatar_url}
                          alt={conv.otherUser.username}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-xl">
                          {conv.otherUser.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <LiveOnlineDot
                      profile={conv.otherUser}
                      size="lg"
                      borderClassName="border-background"
                      className="absolute bottom-0.5 right-0.5"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={cn(
                        "text-[15px] truncate leading-tight font-body",
                        hasUnread || hasSnap ? "font-bold text-foreground" : "font-medium text-foreground"
                      )}>
                        {conv.otherUser.username}
                      </span>
                      {conv.lastMessage && (
                        <span className={cn(
                          "text-[11px] flex-shrink-0 tabular-nums",
                          hasSnap ? `${snapColorClass} font-semibold` : hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                            addSuffix: false,
                            locale: fr,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {hasSnap ? (
                        <div className={cn("flex items-center gap-1.5 text-[13px] font-semibold", snapColorClass)}>
                          {isSnapPhoto ? (
                            <Camera className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                          <span>{isSnapPhoto ? 'Nouveau Selfie' : 'Nouvelle Vidéo'}</span>
                        </div>
                      ) : (
                        <p className={cn(
                          "text-[13px] truncate leading-snug",
                          hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
                        )}>
                          {getMessagePreview(conv)}
                        </p>
                      )}
                      {hasUnread && !hasSnap && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-sm"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                      )}
                    </div>
                  </div>

                  {/* Context menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="p-2 -mr-1 rounded-full hover:bg-muted/80 text-muted-foreground/60 hover:text-muted-foreground flex-shrink-0 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                      {hasUnread ? (
                        <DropdownMenuItem onClick={(e) => handleMarkAsRead(e, conv.otherUser.user_id)}>
                          <MailOpen className="w-4 h-4 mr-2.5" />
                          Marquer comme lu
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={(e) => handleMarkAsUnread(e, conv.otherUser.user_id)}>
                          <Mail className="w-4 h-4 mr-2.5" />
                          Marquer comme non lu
                        </DropdownMenuItem>
                      )}
                      {showArchived ? (
                        <DropdownMenuItem onClick={(e) => handleUnarchive(e, conv.id)}>
                          <ArchiveRestore className="w-4 h-4 mr-2.5" />
                          Restaurer
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={(e) => handleArchive(e, conv.id)}>
                          <Archive className="w-4 h-4 mr-2.5" />
                          Archiver
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setAutoDeleteSheet({ conversationId: conv.id, username: conv.otherUser.username });
                        }}
                      >
                        <Timer className="w-4 h-4 mr-2.5" />
                        Messages éphémères
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(e, conv.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2.5" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="px-2 py-2">
        <AdBanner placement="compact" />
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La conversation sera supprimée de votre liste. Les messages resteront visibles pour l'autre utilisateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {autoDeleteSheet && (
        <ConversationAutoDeleteSheet
          isOpen={true}
          onClose={() => setAutoDeleteSheet(null)}
          conversationId={autoDeleteSheet.conversationId}
          username={autoDeleteSheet.username}
        />
      )}
    </>
  );
};

export default PrivateChatList;
