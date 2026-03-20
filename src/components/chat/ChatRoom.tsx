import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useGroupReadReceipts } from '@/hooks/useGroupReadReceipts';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveConversation } from '@/hooks/useActiveConversation';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import PollMessage from './PollMessage';
import EphemeralMessageRow from './EphemeralMessageRow';
import MembersList from './MembersList';
import TypingIndicator from './TypingIndicator';
import MessageReply from './MessageReply';
import MessageSearch from './MessageSearch';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import MediaGallerySheet from './MediaGallerySheet';
import PinnedMessagesBanner from './PinnedMessagesBanner';
import GroupSettingsDialog from './GroupSettingsDialog';
import VoiceRecorder from './VoiceRecorder';
import MuteButton from './MuteButton';
import { ArrowLeft, Users, Search, Image, Loader2, X, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface ReplyMessage {
  id: string;
  content: string;
  senderName: string;
}

interface ChatRoomProps {
  roomId: string;
  regionCode: string;
  regionName: string;
  memberCount: number;
  isCustomGroup?: boolean;
  onBack: () => void;
  onStartPrivateChat: (userId: string) => void;
}

const ChatRoom = ({ roomId, regionCode, regionName, memberCount, isCustomGroup, onBack, onStartPrivateChat }: ChatRoomProps) => {
  const { user } = useAuth();
  
  // Track active conversation for notification suppression
  useActiveConversation(null, roomId);
  
  // Track if any overlay is open to prevent back navigation
  const [showMembers, setShowMembers] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const hasOverlayOpen = showMembers || showMediaGallery || showSettings;
  
  // Mobile back navigation - disabled when overlays are open
  useMobileNavigation({ onBack, enabled: !hasOverlayOpen });
  
  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  
  const { messages, searchResults, isLoading, sendMessage } = useMessages(roomId, searchQuery);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(roomId);
  const { getReactionsForMessage, toggleReaction } = useMessageReactions(roomId);
  const { getReaders, markAsRead } = useGroupReadReceipts(roomId);
  const { markMentionsAsRead } = useUnreadMentions();
  const { createPoll, vote, lockPoll, getPollForMessage } = usePolls(roomId);
  const { pinnedMessages, pinMessage, unpinMessage, isMessagePinned } = usePinnedMessages(roomId);
  
  // Mark mentions as read when opening the room
  useEffect(() => {
    if (roomId) {
      markMentionsAsRead(roomId);
    }
  }, [roomId, markMentionsAsRead]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const otherMessages = messages
        .filter(m => m.sender_id !== user.id)
        .map(m => m.id);
      if (otherMessages.length > 0) {
        markAsRead(otherMessages);
      }
    }
  }, [messages, user?.id, markAsRead]);
  
  const [replyTo, setReplyTo] = useState<ReplyMessage | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    initialScrollDone.current = false;
    prevMsgCount.current = 0;
    isNearBottomRef.current = true;
  }, [roomId]);

  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // Initial scroll only — once
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDone.current && !searchQuery) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => scrollToBottom(true));
      prevMsgCount.current = messages.length;
    }
  }, [isLoading, messages.length, searchQuery, scrollToBottom]);

  // New message — only scroll if near bottom or own message
  useEffect(() => {
    if (messages.length > prevMsgCount.current && initialScrollDone.current && !searchQuery) {
      const lastMsg = messages[messages.length - 1];
      const isOwnMessage = lastMsg?.sender_id === user?.id;
      if (isOwnMessage || isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(false));
      }
      prevMsgCount.current = messages.length;
    }
  }, [messages.length, messages, user?.id, searchQuery, scrollToBottom]);

  // Typing — only if near bottom
  useEffect(() => {
    if (typingUsers.length > 0 && isNearBottomRef.current && !searchQuery) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [typingUsers.length, searchQuery, scrollToBottom]);

  // Handle scroll to show/hide scroll button + track position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      isNearBottomRef.current = nearBottom;
      setShowScrollButton(!nearBottom);
    }
  }, []);

  // Scroll to search result
  useEffect(() => {
    if (searchResults.length > 0 && searchQuery) {
      const messageId = searchResults[searchIndex];
      const el = document.getElementById(`message-${messageId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchIndex, searchResults, searchQuery]);

  // Keyboard open — always scroll to bottom
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prev = vv.height;
    const onResize = () => {
      if (vv.height < prev - 50) {
        setTimeout(() => scrollToBottom(true), 50);
      }
      prev = vv.height;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollToBottom]);

  const handleInputFocus = useCallback(() => {
    // Scroll handled by visualViewport resize
  }, []);

  const handleSendMessage = async (content: string) => {
    if (content.trim()) {
      sendMessage.mutate({ 
        content, 
        messageType: 'text',
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
      stopTyping();
    }
  };

  const handleCreatePoll = async (question: string, options: string[], isMultipleChoice: boolean) => {
    if (!user) return;
    // Create a message first for the poll
    const { data: msg } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        sender_id: user.id,
        content: `📊 ${question}`,
        message_type: 'poll',
        is_private: false,
      })
      .select()
      .single();

    if (msg) {
      await createPoll.mutateAsync({ question, options, isMultipleChoice, messageId: msg.id });
    }
  };

  const handleTyping = (hasText: boolean) => {
    startTyping(hasText);
  };

  const handleSearchNavigate = (direction: 'prev' | 'next') => {
    if (searchResults.length === 0) return;
    
    if (direction === 'next') {
      setSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else {
      setSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  };

  const handleStartPrivateChat = (userId: string) => {
    setShowMembers(false);
    onStartPrivateChat(userId);
  };

  const handleReply = (message: ReplyMessage) => {
    setReplyTo(message);
  };

  const handleAvatarClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate({ messageId, emoji });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Fixed container to prevent keyboard shift */}


      {/* Suspension banner */}

      {/* Header - fixed at top */}
      <header className="flex-shrink-0 flex items-center gap-2.5 px-2 py-2.5 bg-card/95 backdrop-blur-lg border-b border-border/60 sticky top-0 z-20 shadow-[0_1px_3px_hsl(220_30%_20%/0.04)]">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm">
          {isCustomGroup ? regionName.charAt(0).toUpperCase() : regionCode}
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate text-[15px] leading-tight">
            {isCustomGroup ? regionName : `${regionName} (${regionCode})`}
          </h1>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-0.5">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span>{memberCount} membres</span>
            {typingUsers.length > 0 && (
              <span className="text-primary font-medium animate-pulse truncate">• écrit…</span>
            )}
          </div>
        </div>

        <MuteButton conversationId={roomId} />

        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} className="rounded-full hover:bg-secondary">
          <Search className="w-5 h-5" />
        </Button>
        
        <Sheet open={showMembers} onOpenChange={setShowMembers}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary">
              <Users className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-80">
            <div className="flex items-center justify-between p-4 border-b border-border/60">
              <h2 className="font-semibold text-[15px]">Membres</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMembers(false)} className="rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <MembersList
                regionCode={regionCode}
                onStartPrivateChat={handleStartPrivateChat}
                isCustomGroup={isCustomGroup}
                roomId={roomId}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="icon" onClick={() => setShowMediaGallery(true)} className="rounded-full hover:bg-secondary">
          <Image className="w-5 h-5" />
        </Button>

        {isCustomGroup && (
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="rounded-full hover:bg-secondary">
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </header>

      {/* Pinned messages banner */}
      <PinnedMessagesBanner
        pinnedMessages={pinnedMessages}
        onScrollToMessage={(messageId) => {
          const el = document.getElementById(`message-${messageId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Group Settings Dialog */}
      {isCustomGroup && (
        <GroupSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          roomId={roomId}
          currentName={regionName}
          onGroupDeleted={onBack}
        />
      )}

      {/* Media Gallery */}
      <MediaGallerySheet
        roomId={roomId}
        regionCode={regionCode}
        isOpen={showMediaGallery}
        onClose={() => setShowMediaGallery(false)}
      />

      {/* Search bar */}
      <MessageSearch
        isOpen={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery('');
          setSearchIndex(0);
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          setSearchIndex(0);
        }}
        resultCount={searchResults.length}
        currentIndex={searchIndex}
        onNavigate={handleSearchNavigate}
      />
      
      {/* Messages area - scrollable middle section */}
      <div 
        className="flex-1 overflow-y-auto overscroll-contain p-4" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="space-y-4 pb-4">
          {/* Welcome message */}
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white text-2xl mb-4">
              {isCustomGroup ? regionName.charAt(0).toUpperCase() : regionCode}
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">
              Bienvenue dans {isCustomGroup ? regionName : `le groupe ${regionCode}`}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {regionName} • {memberCount} membres actifs
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {/* Messages */}
          {messages.map((message) => {
            const isEphemeral = message.message_type === 'image' || message.message_type === 'video';
            const isPoll = message.message_type === 'poll';
            const poll = isPoll ? getPollForMessage(message.id) : undefined;

            // Render poll message
            if (isPoll && poll) {
              return (
                <div key={message.id} id={`message-${message.id}`} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <PollMessage
                    poll={poll}
                    isOwn={message.sender_id === user?.id}
                    onVote={(pollId, optionId) => vote.mutate({ pollId, optionId })}
                    onLock={message.sender_id === user?.id ? (pollId) => lockPoll.mutate(pollId) : undefined}
                  />
                </div>
              );
            }

            const chatMsg = (
              <ChatMessage
                key={message.id}
                message={{
                  id: message.id,
                  content: message.content || '',
                  senderId: message.sender_id,
                  senderName: message.senderUsername || 'Anonyme',
                  senderAvatar: message.senderAvatar || undefined,
                  timestamp: new Date(message.created_at),
                  type: message.message_type as 'text' | 'image',
                  replyToMessage: message.replyToMessage,
                }}
                isOwn={message.sender_id === user?.id}
                isHighlighted={searchResults.includes(message.id) && searchResults[searchIndex] === message.id}
                reactions={getReactionsForMessage(message.id)}
                readers={getReaders(message.id)}
                totalMembers={memberCount}
                chatRoomId={roomId}
                onReply={handleReply}
                onAvatarClick={handleAvatarClick}
                onToggleReaction={handleToggleReaction}
              />
            );

            if (isEphemeral) {
              return (
                <EphemeralMessageRow key={message.id} messageId={message.id} senderId={message.sender_id}>
                  {chatMsg}
                </EphemeralMessageRow>
              );
            }

            return chatMsg;
          })}

          {/* Typing indicator */}
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-24 right-4 rounded-full shadow-lg z-10 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => scrollToBottom(true)}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex-shrink-0">
          <MessageReply
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      )}

      {/* Voice recorder */}
      {showVoiceRecorder && (
        <div className="flex-shrink-0 px-4 pb-2">
          <VoiceRecorder
            chatRoomId={roomId}
            isPrivate={false}
            onMessageSent={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          chatRoomId={roomId}
          isPrivate={false}
          isSending={sendMessage.isPending}
          onTyping={handleTyping}
          onFocus={handleInputFocus}
          onVoiceToggle={() => setShowVoiceRecorder(!showVoiceRecorder)}
          showVoiceButton
          showPollButton
          onCreatePoll={handleCreatePoll}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
