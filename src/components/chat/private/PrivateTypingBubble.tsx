/**
 * PrivateTypingBubble — refonte Phase A.
 * Bulle iMessage avec ombre douce et animation plus organique.
 */
import { cn } from '@/lib/utils';

interface PrivateTypingBubbleProps {
  isTyping: boolean;
  avatar: string | null;
  username: string | undefined;
}

const PrivateTypingBubble = ({ isTyping, avatar, username }: PrivateTypingBubbleProps) => {
  if (!isTyping) return null;

  return (
    <div className="flex items-end gap-2 mb-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border/40 shadow-sm">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/25 to-accent/20 flex items-center justify-center text-primary text-xs font-semibold">
            {username?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div
        className={cn(
          'bg-secondary/90 backdrop-blur-sm rounded-[22px] rounded-bl-[6px]',
          'px-4 py-3 flex items-center gap-1.5',
          'shadow-[0_2px_8px_-2px_hsl(220_30%_20%/0.08),0_0_0_0.5px_hsl(var(--border))]',
        )}
      >
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '900ms' }} />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '900ms' }} />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '900ms' }} />
      </div>
    </div>
  );
};

export default PrivateTypingBubble;
