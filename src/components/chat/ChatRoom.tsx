import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types';
import { mockMessages } from '@/data/mockData';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import EphemeralMedia from './EphemeralMedia';
import { ArrowLeft, Users, MoreVertical, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';

interface EphemeralMediaData {
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration: number;
}

interface ChatRoomProps {
  regionCode: string;
  regionName: string;
  memberCount: number;
  onBack: () => void;
}

const ChatRoom = ({ regionCode, regionName, memberCount, onBack }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [viewingMedia, setViewingMedia] = useState<EphemeralMediaData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUserId = '1'; // Simulated current user
  const { isSuspended, getSuspensionTimeLeft } = useScreenshotProtection();

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (content: string, type: 'text' | 'image' | 'video', file?: File, duration?: number) => {
    if (type === 'text') {
      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        senderId: currentUserId,
        senderName: 'Vous',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([...messages, newMessage]);
    } else if (file) {
      // For demo: create object URL
      const mediaUrl = URL.createObjectURL(file);
      const newMessage: Message = {
        id: Date.now().toString(),
        content: `📸 ${type === 'image' ? 'Photo' : 'Vidéo'} éphémère (${duration}s)`,
        senderId: currentUserId,
        senderName: 'Vous',
        timestamp: new Date(),
        type: 'image',
        imageUrl: mediaUrl,
      };
      setMessages([...messages, newMessage]);
    }
  };

  // Demo: simulate receiving ephemeral media
  const handleMediaClick = (message: Message) => {
    if (message.imageUrl && message.senderId !== currentUserId) {
      setViewingMedia({
        type: 'image',
        src: message.imageUrl,
        senderName: message.senderName,
        duration: 10,
      });
    }
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
          
          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id} onClick={() => handleMediaClick(message)} className="cursor-pointer">
              <ChatMessage
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatRoom;
