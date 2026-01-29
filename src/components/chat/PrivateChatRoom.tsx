import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, MoreVertical, Flag, FolderLock } from 'lucide-react';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useProfile } from '@/hooks/useProfiles';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ChatInput from './ChatInput';
import EphemeralMessage from './EphemeralMessage';
import ReportUserDialog from './ReportUserDialog';
import ShareAlbumDialog from '@/components/albums/ShareAlbumDialog';

interface PrivateChatRoomProps {
  otherUserId: string;
  onBack: () => void;
}

const PrivateChatRoom = ({ otherUserId, onBack }: PrivateChatRoomProps) => {
  const { user } = useAuth();
  const { data: otherUserProfile, isLoading: profileLoading } = useProfile(otherUserId);
  const { messages, isLoading, sendMessage } = usePrivateMessages(otherUserId);
  const { markAsRead } = useUnreadMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showShareAlbum, setShowShareAlbum] = useState(false);

  // Mobile back navigation
  useMobileNavigation({ onBack, enabled: true });

  // Mark messages as read when entering the conversation
  useEffect(() => {
    if (otherUserId) {
      markAsRead.mutate(otherUserId);
    }
  }, [otherUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll to bottom when input is focused (keyboard opens)
  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (content.trim()) {
      await sendMessage.mutateAsync({ content, messageType: 'text' });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header - fixed at top */}
      <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {profileLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                {otherUserProfile?.avatar_url ? (
                  <img
                    src={otherUserProfile.avatar_url}
                    alt={otherUserProfile.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  otherUserProfile?.username.charAt(0).toUpperCase()
                )}
              </div>
              {otherUserProfile?.is_online === true && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
              )}
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-foreground">
                {otherUserProfile?.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                {otherUserProfile?.is_online === true ? (
                  <span className="text-green-500">En ligne</span>
                ) : (
                  'Hors ligne'
                )}
              </p>
            </div>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowShareAlbum(true)}>
              <FolderLock className="w-4 h-4 mr-2" />
              Partager un album privé
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => setShowReportDialog(true)}
            >
              <Flag className="w-4 h-4 mr-2" />
              Signaler {otherUserProfile?.username}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Report Dialog */}
      {otherUserProfile && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          userId={otherUserId}
          username={otherUserProfile.username}
        />
      )}

      {/* Share Album Dialog */}
      {otherUserProfile && (
        <ShareAlbumDialog
          isOpen={showShareAlbum}
          onClose={() => setShowShareAlbum(false)}
          recipientId={otherUserId}
          recipientName={otherUserProfile.username}
        />
      )}

      {/* Messages - scrollable middle section */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4" ref={messagesContainerRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <Skeleton className="h-16 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-muted-foreground">
              Commence la conversation avec {otherUserProfile?.username}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              const isEphemeral = message.message_type === 'image' || message.message_type === 'video';

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {message.senderAvatar ? (
                        <img
                          src={message.senderAvatar}
                          alt={message.senderUsername}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        message.senderUsername.charAt(0).toUpperCase()
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Message content */}
                    {isEphemeral ? (
                      <EphemeralMessage
                        messageId={message.id}
                        messageType={message.message_type as 'image' | 'video'}
                        senderName={message.senderUsername}
                        isOwn={isOwn}
                      />
                    ) : (
                      <div
                        className={`message-bubble ${
                          isOwn ? 'message-bubble-sent' : 'message-bubble-received'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          recipientId={otherUserId}
          isPrivate={true}
          onFocus={handleInputFocus}
        />
      </div>
    </div>
  );
};

export default PrivateChatRoom;
