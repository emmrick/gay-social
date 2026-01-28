import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';

interface PrivateChatListProps {
  onSelectConversation: (userId: string) => void;
  selectedUserId: string | null;
}

const PrivateChatList = ({ onSelectConversation, selectedUserId }: PrivateChatListProps) => {
  const { conversations, isLoading } = usePrivateConversations();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">Aucune conversation</h3>
        <p className="text-sm text-muted-foreground">
          Clique sur un membre dans un groupe pour démarrer une conversation privée
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.otherUser.user_id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
              selectedUserId === conv.otherUser.user_id
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-secondary/50'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                {conv.otherUser.avatar_url ? (
                  <img
                    src={conv.otherUser.avatar_url}
                    alt={conv.otherUser.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  conv.otherUser.username.charAt(0).toUpperCase()
                )}
              </div>
              {conv.otherUser.is_online && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-foreground truncate">
                  {conv.otherUser.username}
                </h3>
                {conv.lastMessage && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                      addSuffix: false,
                      locale: fr,
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {conv.lastMessage
                  ? conv.lastMessage.message_type === 'text'
                    ? conv.lastMessage.content
                    : conv.lastMessage.message_type === 'image'
                    ? '📷 Photo'
                    : '🎥 Vidéo'
                  : 'Nouvelle conversation'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

export default PrivateChatList;
