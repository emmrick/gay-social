import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MessageStatus = 'pending' | 'sent' | 'read';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  className?: string;
}

const MessageStatusIndicator = ({ status, className }: MessageStatusIndicatorProps) => {
  if (status === 'pending') {
    // Single empty circle for pending
    return (
      <div className={cn("flex items-center gap-0.5", className)}>
        <div className="w-3 h-3 rounded-full border border-muted-foreground" />
      </div>
    );
  }

  if (status === 'sent') {
    // Two empty circles for sent but not read
    return (
      <div className={cn("flex items-center gap-0.5", className)}>
        <div className="w-3 h-3 rounded-full border border-muted-foreground flex items-center justify-center">
          <Check className="w-2 h-2 text-muted-foreground" />
        </div>
        <div className="w-3 h-3 rounded-full border border-muted-foreground flex items-center justify-center -ml-1.5">
          <Check className="w-2 h-2 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Two filled blue circles for read
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center">
        <Check className="w-2 h-2 text-primary-foreground" />
      </div>
      <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center -ml-1.5">
        <Check className="w-2 h-2 text-primary-foreground" />
      </div>
    </div>
  );
};

export default MessageStatusIndicator;
