import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, MoreVertical, Flag, Ban, UserCheck, Check, CheckCheck, ChevronDown, AlertTriangle } from 'lucide-react';
import { useMobileScreenshotDetection } from '@/hooks/useMobileScreenshotDetection';
import EmojiMessageEffect, { isEmojiOnlyMessage } from './EmojiMessageEffect';
import { notifyScreenshotInChat } from '@/services/screenshotNotificationService';
import { supabase } from '@/integrations/supabase/client';
import MuteButton from './MuteButton';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useProfile } from '@/hooks/useProfiles';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useHasBlockedUser, useUnblockUserAction, useIsStaffUser } from '@/hooks/useUserBlock';
import { usePrivateTypingIndicator } from '@/hooks/usePrivateTypingIndicator';
import { useActiveConversation } from '@/hooks/useActiveConversation';
import { useCreditGifts } from '@/hooks/useCreditGifts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PrivateChatInput from './PrivateChatInput';
import EphemeralMessage from './EphemeralMessage';
import EphemeralMessageRow from './EphemeralMessageRow';
import RegularMediaMessage from './RegularMediaMessage';
import SharedAlbumMessage from './SharedAlbumMessage';
import AlbumAccessRequestMessage from './AlbumAccessRequestMessage';
import CreditRequestMessage from './CreditRequestMessage';
import GiftMessage from './GiftMessage';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageReactions from './MessageReactions';
import ReportUserDialog from './ReportUserDialog';
import BlockUserDialog from './BlockUserDialog';

import { usePrivateMessageReactions } from '@/hooks/usePrivateMessageReactions';
import { cn } from '@/lib/utils';

interface PrivateChatRoomProps {
  otherUserId: string;
  onBack: () => void;
}

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const PrivateChatRoom = ({ otherUserId, onBack }: PrivateChatRoomProps) => {
  const { user } = useAuth();
  const { data: otherUserProfile, isLoading: profileLoading } = useProfile(otherUserId);
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage } = usePrivateMessages(otherUserId);
  const { getReactionsForMessage, toggleReaction } = usePrivateMessageReactions(otherUserId);
  const { sendGift } = useCreditGifts();
  const { markAsRead } = useUnreadMessages();
  const { data: hasBlocked, refetch: refetchBlockStatus } = useHasBlockedUser(otherUserId);
  const unblockUser = useUnblockUserAction();
  const { data: isStaffUser } = useIsStaffUser(otherUserId);
  const { isOtherTyping, startTyping, stopTyping } = usePrivateTypingIndicator(otherUserId);
  
  // Track active conversation for notification suppression
  useActiveConversation(otherUserId, null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const screenshotNotifiedRef = useRef(false);

  // Find the last own message id for read receipt display (Google Messages style)
  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id) return messages[i].id;
    }
    return null;
  }, [messages, user?.id]);

  const handleScreenshotDetected = useCallback(async () => {
    if (!user || screenshotNotifiedRef.current) return;
    screenshotNotifiedRef.current = true;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();
      await notifyScreenshotInChat({
        screenshotterUserId: user.id,
        screenshotterUsername: profile?.username || 'Un membre',
        otherUserId,
        context: 'chat',
      });
    } catch (e) {
      console.error('[PrivateChat] Screenshot notification error:', e);
    }
    setTimeout(() => { screenshotNotifiedRef.current = false; }, 30000);
  }, [user, otherUserId]);

  useMobileScreenshotDetection({
    enabled: true,
    onScreenshotDetected: handleScreenshotDetected,
  });

  useMobileNavigation({ onBack, enabled: true });

  useEffect(() => {
    if (otherUserId) markAsRead.mutate(otherUserId);
  }, [otherUserId]);

  const prevMsgCount = useRef(0);
  const isNearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    prevMsgCount.current = 0;
    initialScrollDone.current = false;
    isNearBottomRef.current = true;
  }, [otherUserId]);

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesContainerRef.current;
    if (el) {
      if (instant) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  // Initial scroll only — once when messages first load
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => scrollToBottom(true));
      prevMsgCount.current = messages.length;
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // New message arrived — only scroll if user was already near bottom
  useEffect(() => {
    if (messages.length > prevMsgCount.current && initialScrollDone.current) {
      const lastMsg = messages[messages.length - 1];
      const isOwnMessage = lastMsg?.sender_id === user?.id;
      // Always scroll for own messages, otherwise only if near bottom
      if (isOwnMessage || isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(false));
      }
      prevMsgCount.current = messages.length;
    }
  }, [messages.length, messages, user?.id, scrollToBottom]);

  // Typing indicator — only scroll if near bottom
  useEffect(() => {
    if (isOtherTyping && isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [isOtherTyping, scrollToBottom]);

  // Keyboard open — only scroll if near bottom
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prev = vv.height;
    const onResize = () => {
      const keyboardOpened = vv.height < prev - 50;
      if (keyboardOpened) {
        // Always scroll to bottom when keyboard opens
        setTimeout(() => scrollToBottom(true), 50);
      }
      prev = vv.height;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollToBottom]);

  const handleInputFocus = useCallback(() => {
    // Scroll handled by visualViewport resize (keyboard open)
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      isNearBottomRef.current = nearBottom;
      setShowScrollButton(!nearBottom);
    }
  }, []);

  const handleSendMessage = async (content: string) => {
    if (content.trim()) {
      stopTyping();
      await sendMessage.mutateAsync({ content, messageType: 'text' });
    }
  };

  const handleSendGift = async (amount: number) => {
    if (!user || !otherUserId) return;
    const { data: msg } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: otherUserId,
      content: JSON.stringify({ type: 'credit_gift', amount }),
      message_type: 'credit_gift',
      is_private: true,
    }).select().single();
    await sendGift.mutateAsync({
      recipientId: otherUserId,
      amount,
      messageId: msg?.id,
    });
  };

  const handleUnblock = async () => {
    await unblockUser.mutateAsync(otherUserId);
    refetchBlockStatus();
  };

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
            onClick={() => navigate(`/profile/${otherUserId}`)}
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
            {isStaffUser ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                <Ban className="w-4 h-4 mr-2" />
                Membre de l'équipe (non blocable)
              </DropdownMenuItem>
            ) : hasBlocked ? (
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
            {!isStaffUser && (
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowReportDialog(true)}>
                <Flag className="w-4 h-4 mr-2" />
                Signaler
              </DropdownMenuItem>
            )}
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

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain relative"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="px-3 py-2 space-y-0.5">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-10 w-44 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <p className="text-muted-foreground text-sm">
                Envoie un message à {otherUserProfile?.username}
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showDate = shouldShowDateSeparator(index);
              const isEphemeralMedia = (message.message_type === 'image' || message.message_type === 'video') && message.content && !message.content.startsWith('http');
              const isRegularMedia = (message.message_type === 'image' || message.message_type === 'video') && message.content && message.content.startsWith('http');
              const isAlbumShare = message.message_type === 'album_share';
              const isAlbumAccessRequest = message.message_type === 'album_access_request';
              const isCreditRequest = message.message_type === 'credit_request';
              const isCreditGift = message.message_type === 'credit_gift';
              const isSystemScreenshot = message.message_type === 'system_screenshot';

              let albumShareData: { shareId: string; albumId: string; albumName: string; expiresAt: string | null } | null = null;
              if (isAlbumShare && message.content) {
                try {
                  const parsed = JSON.parse(message.content);
                  albumShareData = parsed.shareId ? parsed : parsed.data || null;
                } catch { /* ignore */ }
              }

              let albumAccessRequestData: { albumIds: string[]; albumNames: string[]; requesterId: string } | null = null;
              if (isAlbumAccessRequest && message.content) {
                try {
                  albumAccessRequestData = JSON.parse(message.content);
                } catch { /* ignore */ }
              }

              // Grouping: next message same sender within 2min
              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg ||
                nextMsg.sender_id !== message.sender_id ||
                new Date(nextMsg.created_at).getTime() - new Date(message.created_at).getTime() > 120000;

              // Google Messages: show read status only on the LAST own message
              const isLastOwnMessage = isOwn && message.id === lastOwnMessageId;

              const messageContent = (
                <>
                  {/* Date separator */}
                  {showDate && (
                    <div className="flex justify-center py-3">
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                        {formatDateLabel(new Date(message.created_at))}
                      </span>
                    </div>
                  )}

                  {/* System screenshot message */}
                  {isSystemScreenshot ? (
                    <div className="flex justify-center my-3">
                      <div className="max-w-[90%] bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-xs font-bold text-destructive">Capture d'écran détectée</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {message.content?.split('\n\n').map((part, i) => (
                            <span key={i}>{i > 0 && <><br/><br/></>}{
                              part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
                                seg.startsWith('**') && seg.endsWith('**')
                                  ? <strong key={j} className="font-semibold text-destructive">{seg.slice(2, -2)}</strong>
                                  : <span key={j}>{seg.replace(/⚠️ |🚨 /g, '')}</span>
                              )
                            }</span>
                          ))}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ) : (
                  /* Message row — Google Messages style */
                  <div className={cn(
                    "flex items-end gap-2",
                    isOwn ? "justify-end" : "justify-start",
                    isLastInGroup ? "mb-2" : "mb-px"
                  )}>
                    {/* Avatar for received — only last in group */}
                    {!isOwn && (
                      <div className="flex-shrink-0 w-7">
                        {isLastInGroup && otherUserProfile?.avatar_url ? (
                          <img
                            src={`${otherUserProfile.avatar_url}${otherUserProfile.avatar_url.includes('?') ? '&' : '?'}v=${otherUserProfile.updated_at || ''}`}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : isLastInGroup ? (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                            {otherUserProfile?.username?.charAt(0).toUpperCase()}
                          </div>
                        ) : <div className="w-7" />}
                      </div>
                    )}

                    <div className={cn("max-w-[78%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                      {/* Bubble + reaction picker */}
                      <div className="group/msg relative flex items-center gap-1">
                        {isOwn && !isEphemeralMedia && (
                          <div className="md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity">
                            <EmojiReactionPicker onSelect={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })} />
                          </div>
                        )}

                        {isAlbumAccessRequest && albumAccessRequestData ? (
                          <AlbumAccessRequestMessage
                            albumIds={albumAccessRequestData.albumIds}
                            albumNames={albumAccessRequestData.albumNames}
                            requesterId={albumAccessRequestData.requesterId}
                            isOwn={isOwn}
                            messageId={message.id}
                          />
                        ) : isAlbumShare && albumShareData ? (
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
                        ) : isCreditGift ? (() => {
                          let giftData = { amount: 0 };
                          try { giftData = JSON.parse(message.content || '{}'); } catch {}
                          return (
                            <GiftMessage
                              amount={giftData.amount || 0}
                              senderName={message.senderUsername}
                              recipientName={otherUserProfile?.username || ''}
                              isOwn={isOwn}
                            />
                          );
                        })() : isEphemeralMedia ? (
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
                        ) : isEmojiOnlyMessage(message.content || '') ? (
                          <EmojiMessageEffect content={message.content!} isOwn={isOwn} />
                        ) : (
                          <div
                            className={cn(
                              "px-3.5 py-2 text-[14.5px] leading-[1.4] whitespace-pre-wrap break-words",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                : "bg-secondary text-foreground rounded-2xl rounded-bl-md",
                            )}
                            style={{ wordBreak: 'break-word' }}
                          >
                            {message.content}
                          </div>
                        )}

                        {!isOwn && !isEphemeralMedia && (
                          <div className="md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity">
                            <EmojiReactionPicker onSelect={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })} />
                          </div>
                        )}
                      </div>

                      {/* Reactions */}
                      <MessageReactions
                        reactions={getReactionsForMessage(message.id)}
                        onToggleReaction={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })}
                        isOwn={isOwn}
                      />

                      {/* Timestamp + read — Google Messages: time on last in group, read on last own msg only */}
                      {isLastInGroup && (
                        <div className={cn(
                          "flex items-center gap-1 mt-0.5 px-1",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                          </span>
                          {/* Read receipt: only on last own message */}
                          {isLastOwnMessage && (
                            message.read_at ? (
                              <CheckCheck className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-muted-foreground/50" />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </>
              );

              if (isEphemeralMedia) {
                return (
                  <EphemeralMessageRow key={message.id} messageId={message.id} senderId={message.sender_id}>
                    {messageContent}
                  </EphemeralMessageRow>
                );
              }

              return <div key={message.id}>{messageContent}</div>;
            })
          )}

          {/* Typing indicator */}
          {isOtherTyping && (
            <div className="flex items-end gap-2 mb-2">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                {otherUserProfile?.avatar_url ? (
                  <img src={otherUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {otherUserProfile?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Scroll to bottom */}
        {showScrollButton && (
          <button
            className="absolute bottom-3 right-3 rounded-full shadow-lg z-10 bg-card border border-border text-foreground hover:bg-muted w-9 h-9 flex items-center justify-center"
            onClick={() => scrollToBottom()}
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
            onSendGift={handleSendGift}
          />
        )}
      </div>
    </div>
  );
};

export default PrivateChatRoom;
