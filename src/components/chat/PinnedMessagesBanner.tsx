import { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PinnedMessagesBannerProps {
  pinnedMessages: any[];
  onScrollToMessage: (messageId: string) => void;
}

const PinnedMessagesBanner = ({ pinnedMessages, onScrollToMessage }: PinnedMessagesBannerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (pinnedMessages.length === 0 || dismissed) return null;

  const latestPinned = pinnedMessages[0];
  const content = latestPinned?.messages?.content || 'Message épinglé';

  return (
    <div className="flex-shrink-0 border-b border-border bg-primary/5 backdrop-blur-sm">
      <button
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-primary/10 transition-colors"
        onClick={() => {
          if (pinnedMessages.length === 1) {
            onScrollToMessage(latestPinned.message_id);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <Pin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm text-foreground truncate flex-1">
          {content.substring(0, 100)}{content.length > 100 ? '...' : ''}
        </span>
        {pinnedMessages.length > 1 && (
          <span className="text-xs text-primary font-medium flex-shrink-0">
            +{pinnedMessages.length - 1}
          </span>
        )}
        {pinnedMessages.length > 1 && (
          expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        >
          <X className="w-3 h-3" />
        </Button>
      </button>

      {expanded && pinnedMessages.length > 1 && (
        <div className="px-4 pb-2 space-y-1">
          {pinnedMessages.slice(1).map((pin: any) => (
            <button
              key={pin.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
              onClick={() => onScrollToMessage(pin.message_id)}
            >
              <Pin className="w-3 h-3 text-primary/60 flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {(pin.messages?.content || 'Message').substring(0, 80)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PinnedMessagesBanner;
