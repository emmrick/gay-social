import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, ChevronRight } from 'lucide-react';
import PremiumUserBadge from '@/components/premium/PremiumUserBadge';
import UserProfilePreview from './UserProfilePreview';
import { cn } from '@/lib/utils';

interface PrivateChatListProps {
  onSelectConversation: (userId: string) => void;
  selectedUserId: string | null;
}

const PrivateChatList = ({ onSelectConversation, selectedUserId }: PrivateChatListProps) => {
  const { conversations, isLoading } = usePrivateConversations();
  const { getUnreadCount } = useUnreadMessages();
  const [profilePreviewUserId, setProfilePreviewUserId] = useState<string | null>(null);

  // Get user IDs for premium check
  const userIds = useMemo(
    () => conversations.map(conv => conv.otherUser.user_id),
    [conversations]
  );
  const { data: premiumMap = {} } = usePremiumUsers(userIds);

  const handleAvatarClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setProfilePreviewUserId(userId);
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

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5">
          <MessageCircle className="w-10 h-10 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">Aucune conversation</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Utilise le bouton + ci-dessus pour rechercher et démarrer une conversation
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 space-y-2">
      {conversations.map((conv, index) => {
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
                      : '🎥 Vidéo'
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
  );
};

export default PrivateChatList;
