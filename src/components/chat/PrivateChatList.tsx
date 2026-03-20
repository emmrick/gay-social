import { useState, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useConversationStatus } from '@/hooks/useConversationStatus';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { Skeleton } from '@/components/ui/skeleton';
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
import { MessageCircle, MoreVertical, Archive, Trash2, ArchiveRestore, Mail, MailOpen, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConversationAutoDeleteSheet from './ConversationAutoDeleteSheet';

interface PrivateChatListProps {
  onSelectConversation: (userId: string) => void;
  selectedUserId: string | null;
  showArchived?: boolean;
}

const PrivateChatList = ({ onSelectConversation, selectedUserId, showArchived = false }: PrivateChatListProps) => {
  const { conversations, archivedConversations, isLoading } = usePrivateConversations();
  const { getUnreadCount, markAsRead, markAsUnread } = useUnreadMessages();
  const { archiveConversation, unarchiveConversation, deleteConversation } = useConversationStatus();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [autoDeleteSheet, setAutoDeleteSheet] = useState<{ conversationId: string; username: string } | null>(null);
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

  const displayConversations = showArchived ? archivedConversations : conversations;

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

  if (isLoading) {
    return (
      <div className="px-2 py-2 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-2xl">
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

  if (displayConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          {showArchived ? (
            <Archive className="w-9 h-9 text-primary/60" />
          ) : (
            <MessageCircle className="w-9 h-9 text-primary/60" />
          )}
        </div>
        <h3 className="font-semibold text-foreground text-lg mb-1.5">
          {showArchived ? 'Aucune archive' : 'Aucune conversation'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
          {showArchived
            ? 'Vos conversations archivées apparaîtront ici'
            : 'Démarrez une conversation pour commencer à discuter'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 py-1">
        {displayConversations.map((conv) => {
          const unreadCount = getUnreadCount(conv.otherUser.user_id);
          const hasUnread = unreadCount > 0;
          const isSelected = selectedUserId === conv.otherUser.user_id;

          return (
            <div
              key={conv.id}
              onClick={() => {
                if (!wasLongPressRef.current) {
                  onSelectConversation(conv.otherUser.user_id);
                }
              }}
              onPointerDown={() => handleLongPressStart(conv.id, conv.otherUser.username)}
              onPointerUp={handleLongPressEnd}
              onPointerLeave={handleLongPressEnd}
              className={cn(
                "flex items-center gap-3 px-3 py-3.5 cursor-pointer transition-all duration-200 select-none rounded-2xl mx-1 my-0.5",
                "hover:bg-secondary/70 active:scale-[0.98]",
                isSelected && "bg-primary/8 ring-1 ring-primary/15",
                hasUnread && !isSelected && "bg-primary/[0.03]"
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-14 h-14 rounded-full overflow-hidden transition-shadow duration-200",
                  hasUnread && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
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
                {shouldShowOnlineIndicator(conv.otherUser) && (
                  <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-[2.5px] border-background shadow-sm" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={cn(
                    "text-[15px] truncate leading-tight",
                    hasUnread ? "font-bold text-foreground" : "font-medium text-foreground"
                  )}>
                    {conv.otherUser.username}
                  </span>
                  {conv.lastMessage && (
                    <span className={cn(
                      "text-[11px] flex-shrink-0 tabular-nums",
                      hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                        addSuffix: false,
                        locale: fr,
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-[13px] truncate leading-snug",
                    hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
                  )}>
                    {getMessagePreview(conv)}
                  </p>
                  {hasUnread && (
                    <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
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
            </div>
          );
        })}
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
