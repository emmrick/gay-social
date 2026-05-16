import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import AnnouncementMessage from './announcement/AnnouncementMessage';
import AnnouncementComposer from './announcement/AnnouncementComposer';
import MuteButton from './MuteButton';
import { ArrowLeft, Megaphone, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { sendPushNotification } from '@/services/pushNotificationService';


interface AnnouncementChannelProps {
  roomId: string;
  onBack: () => void;
}

const AnnouncementChannel = ({ roomId, onBack }: AnnouncementChannelProps) => {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });

  const isAdminOrMod = isAdmin || isModerator;

  useMobileNavigation({ onBack, enabled: true });

  const { messages, isLoading } = useMessages(roomId, undefined, true);
  const { getReactionsForMessage, toggleReaction } = useMessageReactions(roomId);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleToggleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate({ messageId, emoji });
  };

  const handleAdminSend = async (content: string) => {
    if (!content.trim() || !user) return;
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: roomId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          is_private: false,
        });

      if (error) throw error;

      // Push notification (preview = première ligne texte)
      try {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .neq('user_id', user.id)
          .limit(1000);

        if (allProfiles) {
          const plain = content.trim()
            .replace(/!\[[^\]]*\]\([^)]+\)/g, '[image]')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[*_~`]/g, '');
          const preview = plain.length > 80 ? plain.substring(0, 80) + '…' : plain;

          for (const profile of allProfiles) {
            sendPushNotification({
              userId: profile.user_id,
              title: '📢 Canal Informations',
              body: preview,
              url: '/',
              tag: 'announcement',
              notificationType: 'system',
            }).catch(() => {});
          }
        }
      } catch (pushErr) {
        console.error('Error sending announcement push:', pushErr);
      }

      toast.success('Message publié sur le canal');
    } catch (err) {
      console.error('Error sending announcement:', err);
      toast.error('Erreur lors de la publication');
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden w-full max-w-full">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold text-foreground truncate text-sm">
            Canal Informations
          </h1>
          <p className="text-xs text-muted-foreground">
            Canal officiel • Lecture seule
          </p>
        </div>
        <MuteButton conversationId="announcement" />
      </header>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-4"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="space-y-6 pb-4">
          {/* Welcome */}
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
              <Megaphone className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">
              Canal Informations
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Annonces officielles de l'équipe. Réagissez avec des emojis.
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {messages.map((message) => (
            <AnnouncementMessage
              key={message.id}
              id={message.id}
              content={message.content || ''}
              senderName={message.senderUsername || 'Admin'}
              senderAvatar={message.senderAvatar}
              timestamp={new Date(message.created_at)}
              reactions={getReactionsForMessage(message.id)}
              onToggleReaction={handleToggleReaction}
            />
          ))}
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-24 right-4 rounded-full shadow-lg z-10 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={scrollToBottom}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      )}

      {/* Composer or read-only notice */}
      <div className="flex-shrink-0">
        {isAdminOrMod ? (
          <AnnouncementComposer onSend={handleAdminSend} />
        ) : (
          <div className="border-t border-border px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              📢 Canal en lecture seule — Réagissez avec des emojis
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementChannel;
