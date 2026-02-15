import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useGroupReadReceipts } from '@/hooks/useGroupReadReceipts';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';
import { useAuth } from '@/contexts/AuthContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import EphemeralMedia from './EphemeralMedia';
import MembersList from './MembersList';
import TypingIndicator from './TypingIndicator';
import MessageReply from './MessageReply';
import MessageSearch from './MessageSearch';
import UserProfilePreview from './UserProfilePreview';
import MediaGallerySheet from './MediaGallerySheet';
import { ArrowLeft, Users, Search, Image, Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface EphemeralMediaData {
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration: number;
  mediaId?: string;
}

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
  onBack: () => void;
  onStartPrivateChat: (userId: string) => void;
}

const ChatRoom = ({ roomId, regionCode, regionName, memberCount, onBack, onStartPrivateChat }: ChatRoomProps) => {
  const { user } = useAuth();
  
  // Mobile back navigation
  useMobileNavigation({ onBack, enabled: true });
  
  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  
  const { messages, searchResults, isLoading, sendMessage } = useMessages(roomId, searchQuery);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(roomId);
  const { getReactionsForMessage, toggleReaction } = useMessageReactions(roomId);
  const { getReaders, markAsRead } = useGroupReadReceipts(roomId);
  const { markMentionsAsRead } = useUnreadMentions();
  
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
  
  const [viewingMedia, setViewingMedia] = useState<EphemeralMediaData | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages or when conversation opens
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current && !searchQuery) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    
    // Immediate scroll
    scrollToBottom();
    
    // Delayed scrolls to handle media loading
    const timeoutId = setTimeout(scrollToBottom, 100);
    const timeoutId2 = setTimeout(scrollToBottom, 300);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [messages, searchQuery]);

  // Auto-scroll when someone starts typing in group chat
  useEffect(() => {
    if (typingUsers.length > 0 && scrollRef.current && !searchQuery) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [typingUsers.length, searchQuery]);

  // Handle scroll to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
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

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Handle input focus - scroll to bottom when keyboard opens
  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [scrollToBottom]);

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
    setPreviewUserId(null);
    onStartPrivateChat(userId);
  };

  const handleReply = (message: ReplyMessage) => {
    setReplyTo(message);
  };

  const handleAvatarClick = (userId: string) => {
    setPreviewUserId(userId);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate({ messageId, emoji });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Fixed container to prevent keyboard shift */}
      {viewingMedia && (
        <EphemeralMedia
          type={viewingMedia.type}
          src={viewingMedia.src}
          senderName={viewingMedia.senderName}
          duration={viewingMedia.duration}
          mediaId={viewingMedia.mediaId}
          onClose={() => setViewingMedia(null)}
          onViewed={() => console.log('Media viewed')}
        />
      )}

      {/* User profile preview */}
      <UserProfilePreview
        userId={previewUserId}
        isOpen={!!previewUserId}
        onClose={() => setPreviewUserId(null)}
        onStartPrivateChat={handleStartPrivateChat}
      />

      {/* Suspension banner */}

      {/* Header - fixed at top */}
      <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white text-sm flex-shrink-0">
          {regionCode.startsWith('GRP-') ? regionName.charAt(0).toUpperCase() : regionCode}
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold text-foreground truncate text-sm">
            {regionCode.startsWith('GRP-') ? regionName : `${regionName} (${regionCode})`}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{memberCount} membres</span>
            {typingUsers.length > 0 && (
              <span className="text-primary animate-pulse truncate">• écrit...</span>
            )}
          </div>
        </div>

        {/* Search button */}
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
          <Search className="w-5 h-5" />
        </Button>
        
        <Sheet open={showMembers} onOpenChange={setShowMembers}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Users className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-80">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Membres</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMembers(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <MembersList
                regionCode={regionCode}
                onStartPrivateChat={handleStartPrivateChat}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="icon" onClick={() => setShowMediaGallery(true)}>
          <Image className="w-5 h-5" />
        </Button>
      </header>

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
              {regionCode}
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">
              Bienvenue dans le groupe {regionCode}
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
          {messages.map((message) => (
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
          ))}

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
          onClick={scrollToBottom}
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

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          chatRoomId={roomId}
          isPrivate={false}
          isSending={sendMessage.isPending}
          onTyping={handleTyping}
          onFocus={handleInputFocus}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
