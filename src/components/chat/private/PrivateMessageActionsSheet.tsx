/**
 * Long-press / clic droit menu sur une bulle privée.
 * Style iOS — sheet glass avec actions principales.
 */
import { Pin, PinOff, Copy, Reply, Smile, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PrivateMessageActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: any | null;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onReact: (emoji: string) => void;
}

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

const PrivateMessageActionsSheet = ({
  open,
  onOpenChange,
  message,
  isPinned,
  onPin,
  onUnpin,
  onReact,
}: PrivateMessageActionsSheetProps) => {
  if (!message) return null;

  const isText = !message.message_type || message.message_type === 'text';
  const canCopy = isText && !!message.content;

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copié');
    } catch {
      toast.error('Impossible de copier');
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'rounded-t-3xl border-border/50 px-4 pt-3 pb-6',
          'bg-background/95 backdrop-blur-2xl',
        )}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/25 mb-4" />

        {/* Réactions rapides */}
        <div className="flex items-center justify-around gap-2 mb-4 p-2 rounded-2xl bg-muted/40">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(emoji); onOpenChange(false); }}
              className="text-2xl active:scale-90 hover:scale-110 transition-transform p-1.5"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-1">
          {isPinned ? (
            <ActionButton icon={PinOff} label="Désépingler" onClick={() => { onUnpin(); onOpenChange(false); }} />
          ) : (
            <ActionButton icon={Pin} label="Épingler" onClick={() => { onPin(); onOpenChange(false); }} />
          )}
          {canCopy && (
            <ActionButton icon={Copy} label="Copier le texte" onClick={handleCopy} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium',
      'hover:bg-muted/60 active:bg-muted active:scale-[0.99] transition-all',
      destructive ? 'text-destructive' : 'text-foreground',
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="flex-1 text-left">{label}</span>
  </button>
);

export default PrivateMessageActionsSheet;
