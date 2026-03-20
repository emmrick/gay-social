import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Plus, Mic, Camera, BarChart3 } from 'lucide-react';
import SavedMessagesDialog from './SavedMessagesDialog';
import SnapCaptureDialog from './SnapCaptureDialog';
import CreatePollDialog from './CreatePollDialog';
import MentionAutocomplete from './MentionAutocomplete';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';
import { useIsMobile } from '@/hooks/use-mobile';
import { useForbiddenWords } from '@/hooks/useForbiddenWords';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  chatRoomId?: string;
  recipientId?: string;
  isPrivate?: boolean;
  isSending?: boolean;
  onTyping?: (hasText: boolean) => void;
  onFocus?: () => void;
  onVoiceToggle?: () => void;
  showVoiceButton?: boolean;
  onCreatePoll?: (question: string, options: string[], isMultipleChoice: boolean) => void;
  showPollButton?: boolean;
}

const ChatInput = ({ onSendMessage, chatRoomId, recipientId, isPrivate = false, isSending = false, onTyping, onFocus, onVoiceToggle, showVoiceButton }: ChatInputProps) => {
  const isMobile = useIsMobile();
  const [message, setMessage] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showSnapCapture, setShowSnapCapture] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationId = chatRoomId || recipientId || 'unknown';
  const { checkMessage } = useForbiddenWords(conversationId);
  
  const {
    suggestions,
    isLoading: isMentionLoading,
    isActive: isMentionActive,
    handleTextChange,
    insertMention,
    closeMention,
  } = useMentionAutocomplete(isPrivate ? undefined : chatRoomId);

  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [suggestions]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      const result = await checkMessage(trimmedMessage);
      if (result.blocked) return;
      onSendMessage(trimmedMessage);
      setMessage('');
      setShowOptions(false);
      closeMention();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleSelectMention = (user: { user_id: string; username: string; avatar_url: string | null }) => {
    const newMessage = insertMention(message, user);
    setMessage(newMessage);
    closeMention();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (!isPrivate && isMentionActive && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
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

    if (!isMobile) {
      const isEnterKey = e.key === 'Enter' || e.keyCode === 13;
      if (isEnterKey && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    setMessage(newValue);
    if (!isPrivate) {
      handleTextChange(newValue, cursorPosition);
    }
    onTyping?.(newValue.trim().length > 0);
  };

  const handleInputFocus = () => {
    setShowOptions(false);
    onFocus?.();
    setTimeout(() => onFocus?.(), 300);
  };

  const handleSelectSavedMessage = (content: string) => {
    onSendMessage(content);
    setShowOptions(false);
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-lg relative">
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

      {/* Expanded options panel */}
      {showOptions && (
        <div className="px-4 py-4 flex items-center justify-center gap-8 border-b border-border/50 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col items-center gap-1.5">
            <SavedMessagesDialog onSelectMessage={handleSelectSavedMessage} />
            <span className="text-[10px] text-muted-foreground">Messages</span>
          </div>

          <button
            className="flex flex-col items-center gap-1.5"
            onClick={() => { setShowSnapCapture(true); setShowOptions(false); }}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">Selfie</span>
          </button>

          {showVoiceButton && onVoiceToggle && (
            <button
              className="flex flex-col items-center gap-1.5"
              onClick={() => { onVoiceToggle(); setShowOptions(false); }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">Vocal</span>
            </button>
          )}
        </div>
      )}

      {/* Snap capture dialog */}
      <SnapCaptureDialog
        isOpen={showSnapCapture}
        onClose={() => setShowSnapCapture(false)}
        chatRoomId={chatRoomId}
        isPrivate={isPrivate}
      />

      <div className="flex items-end gap-2 p-3">
        {/* Plus / Close button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full transition-transform duration-200",
            showOptions && "rotate-45"
          )}
          onClick={() => setShowOptions(!showOptions)}
        >
          <Plus className="w-5 h-5" />
        </Button>

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder="Écris ton message..."
          className="flex-1 bg-secondary border-none min-h-[40px] max-h-[120px] py-[10px] px-4 resize-none rounded-2xl text-sm leading-5"
          rows={1}
        />

        {/* Send button */}
        <Button
          variant="gradient"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="w-10 h-10 flex-shrink-0 rounded-full"
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
