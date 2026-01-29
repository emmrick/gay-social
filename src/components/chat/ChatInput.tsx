import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile } from 'lucide-react';
import MediaUploadButton from './MediaUploadButton';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  chatRoomId?: string;
  recipientId?: string;
  isPrivate?: boolean;
  onTyping?: () => void;
  onFocus?: () => void;
}

const ChatInput = ({ onSendMessage, chatRoomId, recipientId, isPrivate = false, onTyping, onFocus }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const handleFocus = () => {
    // Notify parent to scroll to bottom when keyboard opens
    onFocus?.();
    
    // Small delay to ensure keyboard is open before scrolling
    setTimeout(() => {
      onFocus?.();
    }, 300);
  };

  return (
    <div className="p-4 border-t border-border bg-card/50 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        {/* Media upload button */}
        <MediaUploadButton 
          chatRoomId={chatRoomId}
          recipientId={recipientId}
          isPrivate={isPrivate}
        />
        
        {/* Emoji button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-primary"
        >
          <Smile className="w-5 h-5" />
        </Button>
        
        {/* Message input */}
        <Input
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          placeholder="Écris ton message..."
          className="flex-1 bg-secondary border-none h-11"
        />
        
        {/* Send button */}
        <Button 
          variant="gradient" 
          size="icon" 
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-11 h-11"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
