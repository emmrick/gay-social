import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, Ban, UserCheck } from 'lucide-react';
import { useMobileScreenshotDetection } from '@/hooks/useMobileScreenshotDetection';
import { notifyScreenshotInChat } from '@/services/screenshotNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useProfile } from '@/hooks/useProfiles';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useHasBlockedUser, useUnblockUserAction, useIsStaffUser } from '@/hooks/useUserBlock';
import { usePrivateTypingIndicator } from '@/hooks/usePrivateTypingIndicator';
import { useActiveConversation } from '@/hooks/useActiveConversation';
import { useCreditGifts } from '@/hooks/useCreditGifts';
import { useCanContactUser, useAddContactException } from '@/hooks/useContactAgeFilter';
import { usePrivateMessageReactions } from '@/hooks/usePrivateMessageReactions';
import { usePrivatePinnedMessages } from '@/hooks/usePrivatePinnedMessages';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PrivateChatInput from './PrivateChatInput';
import ReportUserDialog from './ReportUserDialog';
import BlockUserDialog from './BlockUserDialog';
import AgeFilterBlockedDialog from './AgeFilterBlockedDialog';
import SnapAutoViewer from './SnapAutoViewer';
import MessageSearch from './MessageSearch';
import PrivateChatHeader from './private/PrivateChatHeader';
import PrivateMessageBubble from './private/PrivateMessageBubble';
import PrivateTypingBubble from './private/PrivateTypingBubble';
import PrivatePinnedBanner from './private/PrivatePinnedBanner';
import PrivateMessageActionsSheet from './private/PrivateMessageActionsSheet';
import { cn } from '@/lib/utils';

interface PrivateChatRoomProps {
  otherUserId: string;
  onBack: () => void;
  autoOpenSnap?: boolean;
  onSnapOpened?: () => void;
}

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const PrivateChatRoom = ({ otherUserId, onBack, autoOpenSnap, onSnapOpened }: PrivateChatRoomProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: otherUserProfile, isLoading: profileLoading } = useProfile(otherUserId);
  const resolvedOtherAvatar = useAvatarUrl(otherUserProfile?.avatar_url);
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage } = usePrivateMessages(otherUserId);
  const { getReactionsForMessage, toggleReaction } = usePrivateMessageReactions(otherUserId);
  const { sendGift } = useCreditGifts();
  const { markAsRead } = useUnreadMessages();
  const { data: hasBlocked, refetch: refetchBlockStatus } = useHasBlockedUser(otherUserId);
  const unblockUser = useUnblockUserAction();
  const { data: isStaffUser } = useIsStaffUser(otherUserId);
  const { isOtherTyping, startTyping, stopTyping } = usePrivateTypingIndicator(otherUserId);
  
  useActiveConversation(otherUserId, null);
  
  const { data: contactCheck } = useCanContactUser(otherUserId);
  const addException = useAddContactException();
  const [showAgeFilterDialog, setShowAgeFilterDialog] = useState(false);

  const { pinnedMessages, pinMessage, unpinMessage, isMessagePinned } = usePrivatePinnedMessages(otherUserId);
  const pinnedIdSet = useMemo(() => new Set(pinnedMessages.map((p: any) => p.message_id)), [pinnedMessages]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [snapViewerMessageId, setSnapViewerMessageId] = useState<string | null>(null);
  const snapAutoOpenDone = useRef(false);
  const screenshotNotifiedRef = useRef(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);

  // Action sheet (long-press)
  const [actionMessage, setActionMessage] = useState<any | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as any[];
    return messages.filter((m: any) => {
      const isText = !m.message_type || m.message_type === 'text';
      return isText && m.content?.toLowerCase().includes(q);
    });
  }, [messages, searchQuery]);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`pmsg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId((cur) => cur === messageId ? null : cur), 1800);
    }
  }, []);

  // Reset search index when query changes
  useEffect(() => { setSearchIndex(0); }, [searchQuery]);

  // Auto-scroll to current search match
  useEffect(() => {
    if (searchResults.length > 0 && searchOpen) {
      const target = searchResults[Math.min(searchIndex, searchResults.length - 1)];
      if (target) scrollToMessage(target.id);
    }
  }, [searchIndex, searchResults, searchOpen, scrollToMessage]);

  const handleSearchNavigate = useCallback((dir: 'prev' | 'next') => {
    if (searchResults.length === 0) return;
    setSearchIndex((i) => {
      if (dir === 'next') return (i + 1) % searchResults.length;
      return (i - 1 + searchResults.length) % searchResults.length;
    });
  }, [searchResults.length]);

  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id) return messages[i].id;
    }
    return null;
  }, [messages, user?.id]);

  // Screenshot detection
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

  useMobileScreenshotDetection({ enabled: true, onScreenshotDetected: handleScreenshotDetected });
  useMobileNavigation({ onBack, enabled: true });

  useEffect(() => {
    if (otherUserId) markAsRead.mutate(otherUserId);
  }, [otherUserId]);

  // Auto-open ephemeral viewer
  useEffect(() => {
    if (autoOpenSnap && !isLoading && messages.length > 0 && !snapAutoOpenDone.current) {
      snapAutoOpenDone.current = true;
      const ephemeralMsg = messages.find(msg => {
        if (msg.sender_id === user?.id) return false;
        if (msg.message_type !== 'image' && msg.message_type !== 'video') return false;
        if (msg.content?.startsWith('http')) return false;
        return true;
      });
      if (ephemeralMsg) setSnapViewerMessageId(ephemeralMsg.id);
      onSnapOpened?.();
    }
  }, [autoOpenSnap, isLoading, messages, user?.id, onSnapOpened]);

  useEffect(() => { snapAutoOpenDone.current = false; }, [otherUserId]);

  // Scroll management
  const prevMsgCount = useRef(0);
  const isNearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    prevMsgCount.current = 0;
    initialScrollDone.current = false;
    isNearBottomRef.current = true;
  }, [otherUserId]);

  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesContainerRef.current;
    if (el) {
      if (instant) el.scrollTop = el.scrollHeight;
      else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => scrollToBottom(true));
      prevMsgCount.current = messages.length;
    }
  }, [isLoading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (messages.length > prevMsgCount.current && initialScrollDone.current) {
      const lastMsg = messages[messages.length - 1];
      const isOwnMessage = lastMsg?.sender_id === user?.id;
      if (isOwnMessage || isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(false));
      }
      prevMsgCount.current = messages.length;
    }
  }, [messages.length, messages, user?.id, scrollToBottom]);

  useEffect(() => {
    if (isOtherTyping && isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [isOtherTyping, scrollToBottom]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prev = vv.height;
    const onResize = () => {
      if (vv.height < prev - 50) setTimeout(() => scrollToBottom(true), 50);
      prev = vv.height;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollToBottom]);

  const handleInputFocus = useCallback(() => {}, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current && initialScrollDone.current) {
        requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
      }
    });
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    else observer.observe(el);
    return () => observer.disconnect();
  }, [otherUserId]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      isNearBottomRef.current = nearBottom;
      setShowScrollButton(!nearBottom);
    }
  }, []);

  // Message sending
  const handleSendMessage = async (content: string) => {
    if (content.trim()) {
      if (contactCheck && !contactCheck.allowed) {
        setShowAgeFilterDialog(true);
        return;
      }
      stopTyping();
      addException.mutate(otherUserId);
      await sendMessage.mutateAsync({ content, messageType: 'text' });
    }
  };

  const handleSendGift = async (amount: number) => {
    if (!user || !otherUserId) return;
    try {
      // 1. Try to transfer credits FIRST (validates balance, anti-spam, etc.)
      const result = await sendGift.mutateAsync({ recipientId: otherUserId, amount });

      // 2. Only if transfer succeeded, post the visible message in chat
      const { data: msg, error: msgError } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: otherUserId,
        content: JSON.stringify({ type: 'credit_gift', amount }),
        message_type: 'credit_gift',
        is_private: true,
      }).select().single();

      if (msgError) {
        console.error('[Gift] Failed to insert chat message:', msgError);
        return;
      }

      // 3. Optimistic update so the gift bubble appears instantly
      if (msg) {
        queryClient.setQueryData<any[]>(
          ['private-messages', user.id, otherUserId],
          (old) => {
            if (old?.some((m) => m.id === msg.id)) return old;
            return [...(old || []), { ...msg, senderUsername: 'Moi', senderAvatar: null }];
          }
        );
        queryClient.invalidateQueries({ queryKey: ['private-conversations', user.id] });
      }
    } catch (e) {
      console.error('[Gift] send_credit_gift failed:', e);
    }
  };

  const handleUnblock = async () => {
    await unblockUser.mutateAsync(otherUserId);
    refetchBlockStatus();
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate({ messageId, emoji });
  };

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    return !isSameDay(new Date(messages[index].created_at), new Date(messages[index - 1].created_at));
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <PrivateChatHeader
        otherUserId={otherUserId}
        otherUserProfile={otherUserProfile}
        resolvedAvatar={resolvedOtherAvatar}
        profileLoading={profileLoading}
        isOtherTyping={isOtherTyping}
        hasBlocked={hasBlocked}
        isStaffUser={isStaffUser}
        onBack={onBack}
        onUnblock={handleUnblock}
        isUnblocking={unblockUser.isPending}
        onShowBlockDialog={() => setShowBlockDialog(true)}
        onShowReportDialog={() => setShowReportDialog(true)}
        onToggleSearch={() => setSearchOpen((v) => !v)}
      />

      {/* Search bar */}
      <MessageSearch
        isOpen={searchOpen}
        onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
        onSearch={setSearchQuery}
        resultCount={searchResults.length}
        currentIndex={searchIndex}
        onNavigate={handleSearchNavigate}
      />

      {/* Pinned banner */}
      <PrivatePinnedBanner
        pinnedMessages={pinnedMessages}
        onScrollToMessage={scrollToMessage}
        onUnpin={(id) => unpinMessage.mutate(id)}
      />

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
        <div className="px-3 py-2">
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
              const showDate = shouldShowDateSeparator(index);
              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg ||
                nextMsg.sender_id !== message.sender_id ||
                new Date(nextMsg.created_at).getTime() - new Date(message.created_at).getTime() > 120000;
              const isOwn = message.sender_id === user?.id;
              const isLastOwnMessage = isOwn && message.id === lastOwnMessageId;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center py-3">
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                        {formatDateLabel(new Date(message.created_at))}
                      </span>
                    </div>
                  )}
                  <PrivateMessageBubble
                    message={message}
                    isOwn={isOwn}
                    isLastInGroup={isLastInGroup}
                    isLastOwnMessage={isLastOwnMessage}
                    otherUserProfile={otherUserProfile}
                    resolvedOtherAvatar={resolvedOtherAvatar}
                    otherUserId={otherUserId}
                    onToggleReaction={handleToggleReaction}
                    getReactionsForMessage={getReactionsForMessage}
                    isPinned={pinnedIdSet.has(message.id)}
                    isHighlighted={highlightedMessageId === message.id}
                    onLongPress={(m) => setActionMessage(m)}
                  />
                </div>
              );
            })
          )}

          <PrivateTypingBubble
            isTyping={isOtherTyping}
            avatar={resolvedOtherAvatar}
            username={otherUserProfile?.username}
          />
        </div>

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

      <AgeFilterBlockedDialog
        open={showAgeFilterDialog}
        onOpenChange={setShowAgeFilterDialog}
        minAge={contactCheck?.minAge ?? 18}
        maxAge={contactCheck?.maxAge ?? 99}
        onReactToProfile={() => {
          setShowAgeFilterDialog(false);
          navigate(`/profile/${otherUserId}`);
        }}
      />

      {snapViewerMessageId && (
        <SnapAutoViewer
          messageId={snapViewerMessageId}
          senderName={otherUserProfile?.username || ''}
          senderAvatar={otherUserProfile?.avatar_url}
          onClose={() => setSnapViewerMessageId(null)}
        />
      )}

      <PrivateMessageActionsSheet
        open={!!actionMessage}
        onOpenChange={(o) => { if (!o) setActionMessage(null); }}
        message={actionMessage}
        isPinned={actionMessage ? isMessagePinned(actionMessage.id) : false}
        onPin={() => actionMessage && pinMessage.mutate(actionMessage.id)}
        onUnpin={() => actionMessage && unpinMessage.mutate(actionMessage.id)}
        onReact={(emoji) => actionMessage && handleToggleReaction(actionMessage.id, emoji)}
      />
    </div>
  );
};

export default PrivateChatRoom;
