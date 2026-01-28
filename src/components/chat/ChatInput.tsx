import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile } from 'lucide-react';
import MediaUploadButton from './MediaUploadButton';

interface ChatInputProps {
  onSendMessage: (content: string, type: 'text' | 'image' | 'video', file?: File, duration?: number) => void;
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMediaSelect = (file: File, type: 'image' | 'video', duration: number) => {
    onSendMessage('', type, file, duration);
  };

  return (
    <div className="p-4 border-t border-border bg-card/50 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        {/* Media upload button */}
        <MediaUploadButton onMediaSelect={handleMediaSelect} />
        
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
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
