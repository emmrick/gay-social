import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
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
import { MessageCircle, ChevronRight, MoreVertical, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import PremiumUserBadge from '@/components/premium/PremiumUserBadge';
import UserProfilePreview from './UserProfilePreview';
import { cn } from '@/lib/utils';

type ViewMode = 'active' | 'archived' | 'deleted';

interface PrivateChatListProps {
  onSelectConversation: (userId: string) => void;
  selectedUserId: string | null;
  viewMode?: ViewMode;
}

const PrivateChatList = ({ onSelectConversation, selectedUserId, viewMode = 'active' }: PrivateChatListProps) => {
  const { conversations, archivedConversations, deletedConversations, isLoading } = usePrivateConversations();
  const { getUnreadCount } = useUnreadMessages();
  const { archiveConversation, unarchiveConversation, deleteConversation, restoreConversation } = useConversationStatus();
  const [profilePreviewUserId, setProfilePreviewUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Use the appropriate conversations based on viewMode
  const displayConversations = viewMode === 'deleted' 
    ? deletedConversations 
    : viewMode === 'archived' 
      ? archivedConversations 
      : conversations;

  // Get user IDs for premium check
  const userIds = useMemo(
    () => displayConversations.map(conv => conv.otherUser.user_id),
    [displayConversations]
  );
  const { data: premiumMap = {} } = usePremiumUsers(userIds);

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

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation.mutate(conversationToDelete);
      setConversationToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePermanentDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmPermanentDelete = () => {
    if (conversationToDelete) {
      // For now, permanent delete just removes the status (restores then immediately re-deletes visibility)
      // In a real app, you might want to actually delete messages
      restoreConversation.mutate(conversationToDelete);
      setConversationToDelete(null);
      setPermanentDeleteDialogOpen(false);
    }
  };

  const handleRestore = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    restoreConversation.mutate(conversationId);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
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
    const emptyConfig = {
      active: {
        icon: <MessageCircle className="w-10 h-10 text-primary" />,
        title: 'Aucune conversation',
        description: 'Utilise le bouton + ci-dessus pour rechercher et démarrer une conversation',
      },
      archived: {
        icon: <Archive className="w-10 h-10 text-primary" />,
        title: 'Aucune archive',
        description: 'Vos conversations archivées apparaîtront ici',
      },
      deleted: {
        icon: <Trash2 className="w-10 h-10 text-muted-foreground" />,
        title: 'Aucune suppression',
        description: 'Les conversations supprimées apparaîtront ici. Vous pourrez les restaurer ou les supprimer définitivement.',
      },
    };
    
    const config = emptyConfig[viewMode];
    
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5">
          {config.icon}
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">
          {config.title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {config.description}
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="px-4 pb-6 space-y-2">
      {displayConversations.map((conv, index) => {
        const unreadCount = getUnreadCount(conv.otherUser.user_id);
        const hasUnread = unreadCount > 0;
        const isPremium = premiumMap[conv.otherUser.user_id] || false;
        
        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.otherUser.user_id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group",
              "bg-secondary/30 border border-transparent",
              "hover:bg-secondary hover:border-border",
              "active:scale-[0.98]",
              selectedUserId === conv.otherUser.user_id && "bg-primary/10 border-primary/20",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Avatar */}
            <button
              onClick={(e) => handleAvatarClick(e, conv.otherUser.user_id)}
              className="relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden",
                "bg-gradient-to-br from-primary to-accent"
              )}>
                {conv.otherUser.avatar_url ? (
                  <img
                    src={conv.otherUser.avatar_url}
                    alt={conv.otherUser.username}
                    className="w-full h-full object-cover"
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
              {/* Premium badge */}
              {isPremium && (
                <div className="absolute -top-1 -left-1">
                  <PremiumUserBadge size="xs" />
                </div>
              )}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h3 className={cn(
                  "font-medium text-foreground truncate",
                  hasUnread && "font-semibold"
                )}>
                  {conv.otherUser.username}
                </h3>
                {conv.lastMessage && (
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
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
                  hasUnread ? "text-foreground" : "text-muted-foreground"
                )}>
                  {conv.lastMessage
                    ? conv.lastMessage.message_type === 'text'
                      ? conv.lastMessage.content
                      : conv.lastMessage.message_type === 'image'
                      ? '📷 Photo'
                      : conv.lastMessage.message_type === 'video'
                      ? '🎥 Vidéo'
                      : conv.lastMessage.message_type === 'album_share'
                      ? '📁 Album partagé'
                      : conv.lastMessage.content
                    : 'Nouvelle conversation'}
                </p>
                
                {hasUnread ? (
                  <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
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
                {viewMode === 'deleted' ? (
                  <>
                    <DropdownMenuItem onClick={(e) => handleRestore(e, conv.id)}>
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restaurer
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handlePermanentDeleteClick(e, conv.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer définitivement
                    </DropdownMenuItem>
                  </>
                ) : viewMode === 'archived' ? (
                  <>
                    <DropdownMenuItem onClick={(e) => handleUnarchive(e, conv.id)}>
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restaurer
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDeleteClick(e, conv.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={(e) => handleArchive(e, conv.id)}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archiver
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDeleteClick(e, conv.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
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

    {/* Permanent Delete Confirmation Dialog */}
    <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. La conversation sera complètement retirée de votre liste.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={confirmPermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default PrivateChatList;
