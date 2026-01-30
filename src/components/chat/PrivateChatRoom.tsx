import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, MoreVertical, Flag, FolderLock, Ban, UserCheck, CheckCheck } from 'lucide-react';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useProfile } from '@/hooks/useProfiles';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useHasBlockedUser, useUnblockUserAction } from '@/hooks/useUserBlock';
import { usePrivateTypingIndicator } from '@/hooks/usePrivateTypingIndicator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ChatInput from './ChatInput';
import EphemeralMessage from './EphemeralMessage';
import RegularMediaMessage from './RegularMediaMessage';
import SharedAlbumMessage from './SharedAlbumMessage';
import ReportUserDialog from './ReportUserDialog';
import BlockUserDialog from './BlockUserDialog';
import ShareAlbumDialog from '@/components/albums/ShareAlbumDialog';
import UserProfilePreview from './UserProfilePreview';

interface PrivateChatRoomProps {
  otherUserId: string;
  onBack: () => void;
}

const PrivateChatRoom = ({ otherUserId, onBack }: PrivateChatRoomProps) => {
  const { user } = useAuth();
  const { data: otherUserProfile, isLoading: profileLoading } = useProfile(otherUserId);
  const { messages, isLoading, sendMessage } = usePrivateMessages(otherUserId);
  const { markAsRead } = useUnreadMessages();
  const { data: hasBlocked, refetch: refetchBlockStatus } = useHasBlockedUser(otherUserId);
  const unblockUser = useUnblockUserAction();
  const { isOtherTyping, startTyping, stopTyping } = usePrivateTypingIndicator(otherUserId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showShareAlbum, setShowShareAlbum] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  // Mobile back navigation
  useMobileNavigation({ onBack, enabled: true });

  // Mark messages as read when entering the conversation
  useEffect(() => {
    if (otherUserId) {
      markAsRead.mutate(otherUserId);
    }
  }, [otherUserId]);

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  // Auto-scroll to bottom on new messages or when conversation opens
  useEffect(() => {
    const scrollToBottom = (instant: boolean = false) => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
      }
    };
    
    // On initial load, scroll instantly without animation
    if (isInitialLoad.current) {
      scrollToBottom(true);
      // Delayed instant scroll to handle media loading
      const timeoutId = setTimeout(() => scrollToBottom(true), 100);
      const timeoutId2 = setTimeout(() => {
        scrollToBottom(true);
        isInitialLoad.current = false;
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
      };
    } else {
      // For new messages, use smooth scroll
      scrollToBottom(false);
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
      stopTyping();
      await sendMessage.mutateAsync({ content, messageType: 'text' });
    }
  };

  const handleUnblock = async () => {
    await unblockUser.mutateAsync(otherUserId);
    refetchBlockStatus();
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header - fixed at top */}
      <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
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
            <button
              onClick={() => setShowProfilePreview(true)}
              className="relative cursor-pointer hover:scale-105 transition-transform"
            >
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
              {isUserTrulyOnline(otherUserProfile) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
              )}
            </button>

            <button
              onClick={() => setShowProfilePreview(true)}
              className="flex-1 text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <h2 className="font-semibold text-foreground">
                {otherUserProfile?.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isUserTrulyOnline(otherUserProfile) ? (
                  <span className="text-green-500">En ligne</span>
                ) : (
                  'Hors ligne'
                )}
              </p>
            </button>
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
            <DropdownMenuSeparator />
            {hasBlocked ? (
              <DropdownMenuItem 
                onClick={handleUnblock}
                disabled={unblockUser.isPending}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Débloquer {otherUserProfile?.username}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowBlockDialog(true)}
              >
                <Ban className="w-4 h-4 mr-2" />
                Bloquer {otherUserProfile?.username}
              </DropdownMenuItem>
            )}
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

      {/* Block Dialog */}
      {otherUserProfile && (
        <BlockUserDialog
          open={showBlockDialog}
          onOpenChange={setShowBlockDialog}
          userId={otherUserId}
          username={otherUserProfile.username}
          onBlocked={() => {
            refetchBlockStatus();
            onBack();
          }}
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

      {/* User Profile Preview */}
      <UserProfilePreview
        userId={otherUserId}
        isOpen={showProfilePreview}
        onClose={() => setShowProfilePreview(false)}
        onStartPrivateChat={() => setShowProfilePreview(false)}
      />

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
              const isEphemeralMedia = (message.message_type === 'image' || message.message_type === 'video') && 
                                       message.content && !message.content.startsWith('http');
              const isRegularMedia = (message.message_type === 'image' || message.message_type === 'video') && 
                                     message.content && message.content.startsWith('http');
              const isAlbumShare = message.message_type === 'album_share';

              // Parse album share data if applicable
              let albumShareData: { shareId: string; albumId: string; albumName: string; expiresAt: string | null } | null = null;
              if (isAlbumShare && message.content) {
                try {
                  const parsed = JSON.parse(message.content);
                  // Handle different response structures safely
                  if (parsed.shareId && parsed.albumId) {
                    albumShareData = parsed;
                  } else if (parsed.data?.shareId && parsed.data?.albumId) {
                    albumShareData = parsed.data;
                  } else {
                    console.error('Invalid album share structure:', Object.keys(parsed));
                  }
                } catch (e) {
                  console.error('Failed to parse album share data:', e, message.content);
                }
              }

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <button
                      onClick={() => setShowProfilePreview(true)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    >
                      {message.senderAvatar ? (
                        <img
                          src={message.senderAvatar}
                          alt={message.senderUsername}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        message.senderUsername.charAt(0).toUpperCase()
                      )}
                    </button>
                  )}

                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Message content */}
                    {isAlbumShare && albumShareData ? (
                      <SharedAlbumMessage
                        shareId={albumShareData.shareId}
                        albumId={albumShareData.albumId}
                        albumName={albumShareData.albumName}
                        expiresAt={albumShareData.expiresAt}
                        sharedByUserId={message.sender_id}
                        isOwn={isOwn}
                      />
                    ) : isEphemeralMedia ? (
                      <EphemeralMessage
                        messageId={message.id}
                        messageType={message.message_type as 'image' | 'video'}
                        senderName={message.senderUsername}
                        isOwn={isOwn}
                        recipientId={otherUserId}
                      />
                    ) : isRegularMedia ? (
                      <RegularMediaMessage
                        mediaUrl={message.content!}
                        mediaType={message.message_type as 'image' | 'video'}
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

                    {/* Timestamp and read status */}
                    <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : ''}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                      </span>
                      {/* Read status indicator - only for own messages */}
                      {isOwn && (
                        <span className="flex items-center">
                          {message.read_at ? (
                            <CheckCheck className="w-3.5 h-3.5 text-primary animate-message-read" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-muted-foreground transition-colors duration-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {isOtherTyping && (
              <div className="flex items-center gap-2 px-2 py-1 animate-fade-in">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {otherUserProfile?.username} écrit...
                </span>
              </div>
            )}
            
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
          onTyping={startTyping}
        />
      </div>
    </div>
  );
};

export default PrivateChatRoom;
