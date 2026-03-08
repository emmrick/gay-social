import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Plus, FolderLock, Camera } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import MediaUploadButton from './MediaUploadButton';
import SavedMessagesDialog from './SavedMessagesDialog';
import ShareAlbumDialog from '@/components/albums/ShareAlbumDialog';
import SnapCaptureDialog from './SnapCaptureDialog';
import { cn } from '@/lib/utils';
import { useForbiddenWords } from '@/hooks/useForbiddenWords';

interface PrivateChatInputProps {
  onSendMessage: (content: string) => void;
  recipientId: string;
  recipientName?: string;
  isSending?: boolean;
  onTyping?: (hasText: boolean) => void;
  onFocus?: () => void;
}

const PrivateChatInput = ({ onSendMessage, recipientId, recipientName, isSending = false, onTyping, onFocus }: PrivateChatInputProps) => {
  const isMobile = useIsMobile();
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showShareAlbum, setShowShareAlbum] = useState(false);
  const [showSnapCapture, setShowSnapCapture] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { checkMessage } = useForbiddenWords(recipientId);

  // Auto-resize textarea
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

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
    setMessage(newValue);
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
      {/* Expanded options panel */}
      {showOptions && (
        <div className="px-4 py-4 flex items-center justify-center gap-8 border-b border-border/50 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col items-center gap-1.5">
            <SavedMessagesDialog onSelectMessage={handleSelectSavedMessage} />
            <span className="text-[10px] text-muted-foreground">Messages</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <MediaUploadButton
              recipientId={recipientId}
              isPrivate={true}
            />
            <span className="text-[10px] text-muted-foreground">Médias</span>
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

          <button
            className="flex flex-col items-center gap-1.5"
            onClick={() => { setShowShareAlbum(true); setShowOptions(false); }}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
              <FolderLock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">Album</span>
          </button>
        </div>
      )}

      {/* Snap capture dialog */}
      <SnapCaptureDialog
        isOpen={showSnapCapture}
        onClose={() => setShowSnapCapture(false)}
        recipientId={recipientId}
        isPrivate={true}
      />

      {/* Share album dialog */}
      <ShareAlbumDialog
        isOpen={showShareAlbum}
        onClose={() => setShowShareAlbum(false)}
        recipientId={recipientId}
        recipientName={recipientName || ''}
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

export default PrivateChatInput;
