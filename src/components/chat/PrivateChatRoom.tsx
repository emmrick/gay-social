import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, MoreVertical, Flag, Ban, UserCheck, CheckCheck, ChevronDown } from 'lucide-react';
import MuteButton from './MuteButton';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useProfile } from '@/hooks/useProfiles';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useHasBlockedUser, useUnblockUserAction } from '@/hooks/useUserBlock';
import { usePrivateTypingIndicator } from '@/hooks/usePrivateTypingIndicator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PrivateChatInput from './PrivateChatInput';
import EphemeralMessage from './EphemeralMessage';
import RegularMediaMessage from './RegularMediaMessage';
import SharedAlbumMessage from './SharedAlbumMessage';
import CreditRequestMessage from './CreditRequestMessage';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageReactions from './MessageReactions';
import ReportUserDialog from './ReportUserDialog';
import BlockUserDialog from './BlockUserDialog';
import UserProfilePreview from './UserProfilePreview';
import { usePrivateMessageReactions } from '@/hooks/usePrivateMessageReactions';
import { cn } from '@/lib/utils';

interface PrivateChatRoomProps {
  otherUserId: string;
  onBack: () => void;
}

// Format date for separator labels
const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const PrivateChatRoom = ({ otherUserId, onBack }: PrivateChatRoomProps) => {
  const { user } = useAuth();
  const { data: otherUserProfile, isLoading: profileLoading } = useProfile(otherUserId);
  const { messages, isLoading, sendMessage } = usePrivateMessages(otherUserId);
  const { getReactionsForMessage, toggleReaction } = usePrivateMessageReactions(otherUserId);
  const { markAsRead } = useUnreadMessages();
  const { data: hasBlocked, refetch: refetchBlockStatus } = useHasBlockedUser(otherUserId);
  const unblockUser = useUnblockUserAction();
  const { isOtherTyping, startTyping, stopTyping } = usePrivateTypingIndicator(otherUserId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  useMobileNavigation({ onBack, enabled: true });

  // Mark as read on enter
  useEffect(() => {
    if (otherUserId) markAsRead.mutate(otherUserId);
  }, [otherUserId]);

  const isInitialLoad = useRef(true);
  const previousMessagesLength = useRef(0);
  const previousOtherUserId = useRef(otherUserId);

  useEffect(() => {
    if (previousOtherUserId.current !== otherUserId) {
      isInitialLoad.current = true;
      previousMessagesLength.current = 0;
      previousOtherUserId.current = otherUserId;
    }
  }, [otherUserId]);

  const scrollToBottom = useCallback((instant: boolean = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      if (!instant) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  useLayoutEffect(() => {
    if (isLoading || messages.length === 0) return;
    if (isInitialLoad.current) {
      scrollToBottom(true);
      const timers = [50, 150, 300, 500].map((d) => setTimeout(() => scrollToBottom(true), d));
      setTimeout(() => {
        isInitialLoad.current = false;
        previousMessagesLength.current = messages.length;
      }, 550);
      return () => timers.forEach(clearTimeout);
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isLoading || isInitialLoad.current) return;
    if (messages.length > previousMessagesLength.current) {
      scrollToBottom(false);
      previousMessagesLength.current = messages.length;
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOtherTyping) scrollToBottom(false);
  }, [isOtherTyping, scrollToBottom]);

  const handleInputFocus = useCallback(() => {
    // Multiple delays to catch keyboard animation on various mobile devices
    setTimeout(() => scrollToBottom(true), 100);
    setTimeout(() => scrollToBottom(true), 300);
    setTimeout(() => scrollToBottom(true), 500);
  }, [scrollToBottom]);

  // Scroll to bottom when mobile keyboard opens (visualViewport resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prevHeight = vv.height;
    const onResize = () => {
      const newHeight = vv.height;
      if (newHeight < prevHeight - 50) {
        setTimeout(() => scrollToBottom(true), 80);
      }
      prevHeight = newHeight;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
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

  // Determine if we should show a date separator before this message
  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const current = new Date(messages[index].created_at);
    const previous = new Date(messages[index - 1].created_at);
    return !isSameDay(current, previous);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-2 px-2 py-2 border-b border-border bg-card z-20"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {profileLoading ? (
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <button
            onClick={() => setShowProfilePreview(true)}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                {otherUserProfile?.avatar_url ? (
                  <img
                    src={`${otherUserProfile.avatar_url}${otherUserProfile.avatar_url.includes('?') ? '&' : '?'}v=${otherUserProfile.updated_at || ''}`}
                    alt={otherUserProfile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {otherUserProfile?.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isUserTrulyOnline(otherUserProfile) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-[15px] text-foreground truncate">
                {otherUserProfile?.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isOtherTyping ? (
                  <span className="text-primary">écrit…</span>
                ) : isUserTrulyOnline(otherUserProfile) ? (
                  <span className="text-green-500">En ligne</span>
                ) : (
                  'Hors ligne'
                )}
              </p>
            </div>
          </button>
        )}

        <MuteButton conversationId={otherUserId} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasBlocked ? (
              <DropdownMenuItem onClick={handleUnblock} disabled={unblockUser.isPending}>
                <UserCheck className="w-4 h-4 mr-2" />
                Débloquer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowBlockDialog(true)}>
                <Ban className="w-4 h-4 mr-2" />
                Bloquer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowReportDialog(true)}>
              <Flag className="w-4 h-4 mr-2" />
              Signaler
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Dialogs */}
      {otherUserProfile && (
        <>
          <ReportUserDialog open={showReportDialog} onOpenChange={setShowReportDialog} userId={otherUserId} username={otherUserProfile.username} />
          <BlockUserDialog open={showBlockDialog} onOpenChange={setShowBlockDialog} userId={otherUserId} username={otherUserProfile.username} onBlocked={() => { refetchBlockStatus(); onBack(); }} />
        </>
      )}
      <UserProfilePreview userId={otherUserId} isOpen={showProfilePreview} onClose={() => setShowProfilePreview(false)} onStartPrivateChat={() => setShowProfilePreview(false)} />

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain relative"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ background: 'var(--gradient-subtle, hsl(var(--background)))' }}
      >
        <div className="px-3 py-2 space-y-0.5">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <p className="text-muted-foreground text-sm">
                Envoyer un message à {otherUserProfile?.username}
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showDate = shouldShowDateSeparator(index);
              const isEphemeralMedia = (message.message_type === 'image' || message.message_type === 'video') && message.content && !message.content.startsWith('http');
              const isRegularMedia = (message.message_type === 'image' || message.message_type === 'video') && message.content && message.content.startsWith('http');
              const isAlbumShare = message.message_type === 'album_share';
              const isCreditRequest = message.message_type === 'credit_request';

              let albumShareData: { shareId: string; albumId: string; albumName: string; expiresAt: string | null } | null = null;
              if (isAlbumShare && message.content) {
                try {
                  const parsed = JSON.parse(message.content);
                  albumShareData = parsed.shareId ? parsed : parsed.data || null;
                } catch { /* ignore */ }
              }

              // Check if next message is same sender and within 2min for grouping
              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg ||
                nextMsg.sender_id !== message.sender_id ||
                new Date(nextMsg.created_at).getTime() - new Date(message.created_at).getTime() > 120000;

              return (
                <div key={message.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="flex justify-center py-3">
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/80 px-3 py-1 rounded-full">
                        {formatDateLabel(new Date(message.created_at))}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={cn(
                    "flex",
                    isOwn ? "justify-end" : "justify-start",
                    isLastInGroup ? "mb-2" : "mb-0.5"
                  )}>
                    <div className={cn("max-w-[80%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                      {/* Message content with reaction picker */}
                      <div className="group/msg relative flex items-center gap-1">
                        {/* Reaction picker - left for own messages */}
                        {isOwn && !isEphemeralMedia && (
                          <div className="md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity">
                            <EmojiReactionPicker onSelect={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })} />
                          </div>
                        )}

                        {isAlbumShare && albumShareData ? (
                          <SharedAlbumMessage
                            shareId={albumShareData.shareId}
                            albumId={albumShareData.albumId}
                            albumName={albumShareData.albumName}
                            expiresAt={albumShareData.expiresAt}
                            sharedByUserId={message.sender_id}
                            isOwn={isOwn}
                          />
                        ) : isCreditRequest ? (
                          <CreditRequestMessage
                            messageId={message.id}
                            content={message.content || ''}
                            senderId={message.sender_id}
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
                          <div className={cn(
                            "px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                              : "bg-card border border-border text-foreground rounded-2xl rounded-bl-md",
                            "max-w-full"
                          )}
                          style={{ wordBreak: 'break-word' }}
                          >
                            {message.content}
                          </div>
                        )}

                        {/* Reaction picker - right for received messages */}
                        {!isOwn && !isEphemeralMedia && (
                          <div className="md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity">
                            <EmojiReactionPicker onSelect={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })} />
                          </div>
                        )}
                      </div>

                      {/* Reactions display */}
                      <MessageReactions
                        reactions={getReactionsForMessage(message.id)}
                        onToggleReaction={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })}
                        isOwn={isOwn}
                      />

                      {/* Timestamp + read status - only on last in group */}
                      {isLastInGroup && (
                        <div className={cn(
                          "flex items-center gap-1 mt-0.5 px-1",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                          </span>
                          {isOwn && (
                            <CheckCheck className={cn(
                              "w-3.5 h-3.5",
                              message.read_at ? "text-primary" : "text-muted-foreground/50"
                            )} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {isOtherTyping && (
            <div className="flex justify-start mb-2">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Scroll to bottom */}
        {showScrollButton && (
          <button
            className="absolute bottom-3 right-3 rounded-full shadow-lg z-10 bg-card border border-border text-foreground hover:bg-muted w-9 h-9 flex items-center justify-center"
            onClick={() => scrollToBottom(false)}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        {hasBlocked ? (
          <div className="px-4 py-3 border-t border-border bg-card">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 min-w-0">
                <Ban className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive truncate">
                  Vous avez bloqué {otherUserProfile?.username}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnblock}
                disabled={unblockUser.isPending}
                className="flex-shrink-0 text-xs"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Débloquer
              </Button>
            </div>
          </div>
        ) : (
          <PrivateChatInput
            onSendMessage={handleSendMessage}
            recipientId={otherUserId}
            recipientName={otherUserProfile?.username}
            isSending={sendMessage.isPending}
            onFocus={handleInputFocus}
            onTyping={startTyping}
          />
        )}
      </div>
    </div>
  );
};

export default PrivateChatRoom;
