/**
 * PrivateChatInput — refonte Phase A "Premium iMessage".
 * Composer arrondi profond, send button gradient, panneau d'options aéré.
 * Logique métier 100% inchangée.
 */
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Plus, FolderLock, Camera, Gift } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import SavedMessagesDialog from './SavedMessagesDialog';
import ShareAlbumDialog from '@/components/albums/ShareAlbumDialog';
import SnapCaptureDialog from './SnapCaptureDialog';
import SendGiftDialog from './SendGiftDialog';
import { cn } from '@/lib/utils';
import { useForbiddenWords } from '@/hooks/useForbiddenWords';

interface PrivateChatInputProps {
  onSendMessage: (content: string) => void;
  recipientId: string;
  recipientName?: string;
  isSending?: boolean;
  onTyping?: (hasText: boolean) => void;
  onFocus?: () => void;
  onSendGift?: (amount: number) => void;
}

const PrivateChatInput = ({
  onSendMessage,
  recipientId,
  recipientName,
  isSending = false,
  onTyping,
  onFocus,
  onSendGift,
}: PrivateChatInputProps) => {
  const isMobile = useIsMobile();
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showShareAlbum, setShowShareAlbum] = useState(false);
  const [showSnapCapture, setShowSnapCapture] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
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

  const hasText = message.trim().length > 0;

  return (
    <div
      className={cn(
        'relative bg-background/85 backdrop-blur-2xl backdrop-saturate-150',
        'border-t border-border/40',
        'before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-border/60 before:to-transparent',
      )}
    >
      {/* Panneau options */}
      {showOptions && (
        <div className="px-4 py-4 grid grid-cols-4 gap-2 border-b border-border/30 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-500/10 text-violet-500 transition-all duration-200 hover:scale-105 hover:shadow-md [&_button]:w-full [&_button]:h-full [&_button]:rounded-2xl [&_button]:bg-transparent [&_button]:hover:bg-transparent">
              <SavedMessagesDialog onSelectMessage={handleSelectSavedMessage} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Enregistrés</span>
          </div>
          <ActionTile
            icon={Camera}
            label="Selfie"
            tone="teal"
            onClick={() => { setShowSnapCapture(true); setShowOptions(false); }}
          />
          <ActionTile
            icon={FolderLock}
            label="Album"
            tone="primary"
            onClick={() => { setShowShareAlbum(true); setShowOptions(false); }}
          />
          {onSendGift && (
            <ActionTile
              icon={Gift}
              label="Cadeau"
              tone="orange"
              onClick={() => { setShowGiftDialog(true); setShowOptions(false); }}
            />
          )}
        </div>
      )}

      {/* Dialogs */}
      {onSendGift && (
        <SendGiftDialog
          isOpen={showGiftDialog}
          onClose={() => setShowGiftDialog(false)}
          recipientName={recipientName || ''}
          onSendGift={(amount) => {
            onSendGift(amount);
            setShowGiftDialog(false);
          }}
        />
      )}
      <SnapCaptureDialog
        isOpen={showSnapCapture}
        onClose={() => setShowSnapCapture(false)}
        recipientId={recipientId}
        isPrivate={true}
      />
      <ShareAlbumDialog
        isOpen={showShareAlbum}
        onClose={() => setShowShareAlbum(false)}
        recipientId={recipientId}
        recipientName={recipientName || ''}
      />

      {/* Composer */}
      <div
        className="flex items-end gap-2 px-3 py-2.5"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Plus / Close */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Plus d'options"
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full transition-all duration-300',
            'hover:bg-muted/60 active:scale-90',
            showOptions && 'rotate-45 bg-muted/40',
          )}
          onClick={() => setShowOptions(!showOptions)}
        >
          <Plus className="w-5 h-5" />
        </Button>

        {/* Champ + send */}
        <div
          className={cn(
            'flex-1 flex items-end gap-1 rounded-[24px] pl-4 pr-1 py-1',
            'bg-muted/40 border border-border/40',
            'focus-within:border-primary/40 focus-within:bg-muted/60 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.06)]',
            'transition-all duration-200',
          )}
        >
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="iMessage…"
            className={cn(
              'flex-1 bg-transparent border-none px-0 py-2 min-h-[40px] max-h-[120px] resize-none',
              'text-[15px] leading-[1.35] placeholder:italic placeholder:text-muted-foreground/55',
              'focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none',
            )}
            rows={1}
          />

          <Button
            size="icon"
            aria-label="Envoyer"
            onClick={handleSend}
            disabled={!hasText || isSending}
            className={cn(
              'w-9 h-9 flex-shrink-0 rounded-full mb-0.5 transition-all duration-200',
              hasText
                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)] hover:shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.6)] hover:scale-[1.02] active:scale-95'
                : 'bg-muted/60 text-muted-foreground/40',
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const TONE_MAP = {
  primary: 'bg-primary/10 text-primary',
  violet: 'bg-violet-500/10 text-violet-500',
  teal: 'bg-teal-500/10 text-teal-500',
  orange: 'bg-orange-500/10 text-orange-500',
} as const;

const ActionTile = ({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  tone: keyof typeof TONE_MAP;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
  >
    <div
      className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center',
        'transition-all duration-200 group-hover:scale-105 group-hover:shadow-md',
        TONE_MAP[tone],
      )}
    >
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
  </button>
);

export default PrivateChatInput;
