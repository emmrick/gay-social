import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile } from 'lucide-react';
import MediaUploadButton from './MediaUploadButton';
import SavedMessagesDialog from './SavedMessagesDialog';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Max height of 120px (about 4 lines)
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const handleFocus = () => {
    onFocus?.();
    setTimeout(() => {
      onFocus?.();
    }, 300);
  };

  const handleSelectSavedMessage = (content: string) => {
    onSendMessage(content);
  };

  return (
    <div className="p-3 border-t border-border bg-card/50 backdrop-blur-lg">
      <div className="flex items-end gap-2">
        {/* Media upload button */}
        <MediaUploadButton 
          chatRoomId={chatRoomId}
          recipientId={recipientId}
          isPrivate={isPrivate}
        />

        {/* Saved messages button */}
        <SavedMessagesDialog onSelectMessage={handleSelectSavedMessage} />
        
        {/* Emoji button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10"
        >
          <Smile className="w-5 h-5" />
        </Button>
        
        {/* Message input - Textarea for multiline */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Écris ton message..."
          className="flex-1 bg-secondary border-none min-h-[40px] max-h-[120px] py-2.5 px-4 resize-none rounded-2xl text-sm leading-normal"
          rows={1}
        />
        
        {/* Send button */}
        <Button 
          variant="gradient" 
          size="icon" 
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-10 h-10 flex-shrink-0 rounded-full"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
