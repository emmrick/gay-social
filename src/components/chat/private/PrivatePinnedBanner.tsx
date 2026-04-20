/**
 * Bandeau iMessage-style affichant les messages épinglés d'une conversation privée.
 * Sticky sous le header, glassmorphique, animation d'apparition.
 */
import { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PrivatePinnedBannerProps {
  pinnedMessages: any[];
  onScrollToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

const previewOf = (msg: any): string => {
  if (!msg) return 'Message épinglé';
  switch (msg.message_type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Vidéo';
    case 'credit_gift': return '🎁 Cadeau de crédits';
    case 'album_share': return '📁 Album partagé';
    case 'album_access_request': return '🔒 Demande d’accès album';
    case 'credit_request': return '💸 Demande de crédits';
    default: return msg.content || 'Message épinglé';
  }
};

const PrivatePinnedBanner = ({ pinnedMessages, onScrollToMessage, onUnpin }: PrivatePinnedBannerProps) => {
  const [expanded, setExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latest = pinnedMessages[0];
  const latestPreview = previewOf(latest?.messages);
  const hasMultiple = pinnedMessages.length > 1;

  return (
    <div
      className={cn(
        'flex-shrink-0 z-10',
        'bg-background/75 backdrop-blur-2xl backdrop-saturate-150',
        'border-b border-border/40',
        'animate-in fade-in slide-in-from-top-1 duration-200',
      )}
    >
      <button
        type="button"
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors"
        onClick={() => {
          if (!hasMultiple) onScrollToMessage(latest.message_id);
          else setExpanded((v) => !v);
        }}
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/12 flex items-center justify-center">
          <Pin className="w-3.5 h-3.5 text-primary fill-primary/30" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] uppercase tracking-wider font-semibold text-primary/80 leading-none mb-0.5">
            Épinglé{hasMultiple ? ` · ${pinnedMessages.length}` : ''}
          </p>
          <p className="text-[13px] text-foreground/90 truncate leading-tight">
            {latestPreview.substring(0, 110)}{latestPreview.length > 110 ? '…' : ''}
          </p>
        </div>
        {hasMultiple && (
          expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        {!hasMultiple && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onUnpin(latest.message_id); }}
            >
              <X className="w-3.5 h-3.5" />
            </span>
          </Button>
        )}
      </button>

      {expanded && hasMultiple && (
        <div className="px-3 pb-2 space-y-1 max-h-56 overflow-y-auto">
          {pinnedMessages.map((pin: any) => (
            <div
              key={pin.id}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <button
                type="button"
                onClick={() => { onScrollToMessage(pin.message_id); setExpanded(false); }}
                className="flex-1 flex items-center gap-2 min-w-0 text-left"
              >
                <Pin className="w-3 h-3 text-primary/60 flex-shrink-0" />
                <span className="text-[12.5px] text-foreground/85 truncate">
                  {previewOf(pin.messages).substring(0, 90)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onUnpin(pin.message_id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                aria-label="Désépingler"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrivatePinnedBanner;
