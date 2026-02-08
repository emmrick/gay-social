import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

import { useConversationStatus } from '@/hooks/useConversationStatus';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
import { MessageCircle, ChevronRight, MoreVertical, Archive, Trash2, ArchiveRestore, Mail, MailOpen } from 'lucide-react';

import UserProfilePreview from './UserProfilePreview';
import { cn } from '@/lib/utils';

interface PrivateChatListProps {
  onSelectConversation: (userId: string) => void;
  selectedUserId: string | null;
  showArchived?: boolean;
}

const PrivateChatList = ({ onSelectConversation, selectedUserId, showArchived = false }: PrivateChatListProps) => {
  const { conversations, archivedConversations, isLoading } = usePrivateConversations();
  const { getUnreadCount, markAsRead, markAsUnread } = useUnreadMessages();
  const { archiveConversation, unarchiveConversation, deleteConversation } = useConversationStatus();
  const [profilePreviewUserId, setProfilePreviewUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Use archived or active conversations based on prop
  const displayConversations = showArchived ? archivedConversations : conversations;


  const handleAvatarClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setProfilePreviewUserId(userId);
  };

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

  if (isLoading) {
    return (
      <div className="px-5 py-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5">
          {showArchived ? (
            <Archive className="w-10 h-10 text-primary" />
          ) : (
            <MessageCircle className="w-10 h-10 text-primary" />
          )}
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">
          {showArchived ? 'Aucune archive' : 'Aucune conversation'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {showArchived 
            ? 'Vos conversations archivées apparaîtront ici'
            : 'Utilise le bouton + ci-dessus pour rechercher et démarrer une conversation'
          }
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="px-5 pb-6 space-y-2">
      {displayConversations.map((conv, index) => {
        const unreadCount = getUnreadCount(conv.otherUser.user_id);
        const hasUnread = unreadCount > 0;
        
        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.otherUser.user_id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group",
              "active:scale-[0.98]",
              "animate-fade-in",
              // Unread state - more prominent styling
              hasUnread 
                ? "bg-primary/10 border-2 border-primary/30 shadow-md shadow-primary/10" 
                : "bg-secondary/30 border border-transparent",
              // Hover states
              hasUnread
                ? "hover:bg-primary/15 hover:border-primary/40"
                : "hover:bg-secondary hover:border-border",
              // Selected state
              selectedUserId === conv.otherUser.user_id && "bg-primary/15 border-primary/30"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Avatar with unread indicator ring */}
            <button
              onClick={(e) => handleAvatarClick(e, conv.otherUser.user_id)}
              className="relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden",
                "bg-gradient-to-br from-primary to-accent",
                // Ring around avatar for unread
                hasUnread && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}>
                {conv.otherUser.avatar_url ? (
                  <img
                    src={`${conv.otherUser.avatar_url}${conv.otherUser.avatar_url.includes('?') ? '&' : '?'}v=${Date.now()}`}
                    alt={conv.otherUser.username}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  conv.otherUser.username.charAt(0).toUpperCase()
                )}
              </div>
              {/* Online/Offline indicator */}
              {shouldShowOnlineIndicator(conv.otherUser) ? (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              ) : (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-background" />
              )}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h3 className={cn(
                  "truncate",
                  hasUnread 
                    ? "font-bold text-foreground" 
                    : "font-medium text-foreground"
                )}>
                  {conv.otherUser.username}
                </h3>
                {conv.lastMessage && (
                  <span className={cn(
                    "text-[11px] flex-shrink-0",
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
                  "text-sm truncate",
                  hasUnread 
                    ? "text-foreground font-medium" 
                    : "text-muted-foreground"
                )}>
                  {conv.lastMessage
                    ? conv.lastMessage.message_type === 'text'
                      ? (conv.lastMessage.content && conv.lastMessage.content.length > 35
                          ? conv.lastMessage.content.substring(0, 35) + '...'
                          : conv.lastMessage.content)
                      : conv.lastMessage.message_type === 'image'
                      ? '📷 Photo'
                      : conv.lastMessage.message_type === 'video'
                      ? '🎥 Vidéo'
                      : conv.lastMessage.message_type === 'album_share'
                      ? '📁 Album partagé'
                      : (conv.lastMessage.content && conv.lastMessage.content.length > 35
                          ? conv.lastMessage.content.substring(0, 35) + '...'
                          : conv.lastMessage.content)
                    : 'Nouvelle conversation'}
                </p>
                
                {hasUnread ? (
                  <span className="flex-shrink-0 min-w-6 h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {/* Read/Unread options */}
                {hasUnread ? (
                  <DropdownMenuItem onClick={(e) => handleMarkAsRead(e, conv.otherUser.user_id)}>
                    <MailOpen className="w-4 h-4 mr-2" />
                    Marquer comme lu
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => handleMarkAsUnread(e, conv.otherUser.user_id)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Marquer comme non lu
                  </DropdownMenuItem>
                )}
                
                {/* Archive/Restore options */}
                {showArchived ? (
                  <DropdownMenuItem onClick={(e) => handleUnarchive(e, conv.id)}>
                    <ArchiveRestore className="w-4 h-4 mr-2" />
                    Restaurer
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => handleArchive(e, conv.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archiver
                  </DropdownMenuItem>
                )}
                
                {/* Delete option */}
                <DropdownMenuItem 
                  onClick={(e) => handleDeleteClick(e, conv.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </button>
        );
      })}

      {/* User Profile Preview */}
      <UserProfilePreview
        userId={profilePreviewUserId}
        isOpen={!!profilePreviewUserId}
        onClose={() => setProfilePreviewUserId(null)}
        onStartPrivateChat={(userId) => {
          setProfilePreviewUserId(null);
          onSelectConversation(userId);
        }}
      />
    </div>

    {/* Delete Confirmation Dialog */}
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
    </>
  );
};

export default PrivateChatList;
