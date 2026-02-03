import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile, Loader2 } from 'lucide-react';
import MediaUploadButton from './MediaUploadButton';
import SavedMessagesDialog from './SavedMessagesDialog';
import MentionAutocomplete from './MentionAutocomplete';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  chatRoomId?: string;
  recipientId?: string;
  isPrivate?: boolean;
  isSending?: boolean;
  onTyping?: () => void;
  onFocus?: () => void;
}

const ChatInput = ({ onSendMessage, chatRoomId, recipientId, isPrivate = false, isSending = false, onTyping, onFocus }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Only enable mentions for group chats, not private conversations
  const {
    suggestions,
    isLoading: isMentionLoading,
    isActive: isMentionActive,
    handleTextChange,
    insertMention,
    closeMention,
  } = useMentionAutocomplete(isPrivate ? undefined : chatRoomId);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [suggestions]);

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
      closeMention();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleSelectMention = (user: { user_id: string; username: string; avatar_url: string | null }) => {
    const newMessage = insertMention(message, user);
    setMessage(newMessage);
    closeMention();
    // Focus back on textarea
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore events during IME composition (mobile keyboards, autocomplete, predictive text)
    // This prevents issues where space or other keys trigger unintended actions
    if (e.nativeEvent.isComposing) {
      return;
    }

    // Handle mention autocomplete navigation (only for group chats)
    if (!isPrivate && isMentionActive && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMention();
        return;
      }
    }

    // Send on Enter only (Shift+Enter for new line)
    // Use strict key check to avoid issues with mobile keyboards
    const isEnterKey = e.key === 'Enter' || e.keyCode === 13;
    if (isEnterKey && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setMessage(newValue);
    
    // Only process mentions for group chats
    if (!isPrivate) {
      handleTextChange(newValue, cursorPosition);
    }
    
    onTyping?.();
  };

  const handleInputFocus = () => {
    onFocus?.();
    setTimeout(() => {
      onFocus?.();
    }, 300);
  };

  const handleSelectSavedMessage = (content: string) => {
    onSendMessage(content);
  };

  // Different placeholder for private vs group chats
  const placeholder = isPrivate 
    ? "Écris ton message... (Shift+Entrée pour sauter une ligne)"
    : "Écris ton message... (@ pour mentionner)";

  return (
    <div className="p-3 border-t border-border bg-card/50 backdrop-blur-lg relative">
      {/* Mention autocomplete dropdown - only for group chats */}
      {!isPrivate && (
        <MentionAutocomplete
          suggestions={suggestions}
          isLoading={isMentionLoading}
          isActive={isMentionActive}
          selectedIndex={selectedSuggestionIndex}
          onSelect={handleSelectMention}
        />
      )}

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
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="flex-1 bg-secondary border-none min-h-[40px] max-h-[120px] py-[10px] px-4 resize-none rounded-2xl text-sm leading-5"
          rows={1}
        />
        
        {/* Send button */}
        <Button 
          variant="gradient" 
          size="icon" 
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="w-10 h-10 flex-shrink-0 rounded-full relative"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
