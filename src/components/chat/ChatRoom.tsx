import { useState, useRef, useEffect } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import EphemeralMedia from './EphemeralMedia';
import MembersList from './MembersList';
import { ArrowLeft, Users, MoreVertical, Image, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface EphemeralMediaData {
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration: number;
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
  const { messages, isLoading, sendMessage } = useMessages(roomId);
  const { user } = useAuth();
  const [viewingMedia, setViewingMedia] = useState<EphemeralMediaData | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isSuspended, getSuspensionTimeLeft } = useScreenshotProtection();

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (content.trim()) {
      sendMessage.mutate({ content, messageType: 'text' });
    }
  };

  const handleStartPrivateChat = (userId: string) => {
    setShowMembers(false);
    onStartPrivateChat(userId);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Ephemeral media viewer */}
      {viewingMedia && (
        <EphemeralMedia
          type={viewingMedia.type}
          src={viewingMedia.src}
          senderName={viewingMedia.senderName}
          duration={viewingMedia.duration}
          onClose={() => setViewingMedia(null)}
          onViewed={() => console.log('Media viewed')}
        />
      )}

      {/* Suspension banner */}
      {isSuspended && (
        <div className="bg-destructive/20 border-b border-destructive/30 px-4 py-2 text-center">
          <p className="text-sm text-destructive font-medium">
            ⚠️ Compte suspendu - Temps restant : {getSuspensionTimeLeft()}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-lg">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white">
          {regionCode}
        </div>
        
        <div className="flex-1">
          <h1 className="font-display font-semibold text-foreground">
            Groupe {regionCode}
          </h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{memberCount} membres</span>
          </div>
        </div>
        
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

        <Button variant="ghost" size="icon">
          <Image className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
                timestamp: new Date(message.created_at),
                type: message.message_type as 'text' | 'image',
              }}
              isOwn={message.sender_id === user?.id}
            />
          ))}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage} 
        chatRoomId={roomId}
        isPrivate={false}
      />
    </div>
  );
};

export default ChatRoom;
