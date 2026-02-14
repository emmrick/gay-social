import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadReceipt {
  user_id: string;
  read_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface MessageReadReceiptsProps {
  readers: ReadReceipt[];
  isOwn: boolean;
  totalMembers?: number;
  senderId: string;
}

const MessageReadReceipts = ({ readers, isOwn, totalMembers, senderId }: MessageReadReceiptsProps) => {
  // Only show for own messages
  if (!isOwn) return null;

  // Filter out the sender from readers
  const otherReaders = readers.filter(r => r.user_id !== senderId);

  if (otherReaders.length === 0) {
    return null;
  }

  // Check if all members have read (excluding sender)
  const allRead = totalMembers && otherReaders.length >= (totalMembers - 1);
  const maxAvatars = 4;
  const displayReaders = otherReaders.slice(0, maxAvatars);
  const remaining = otherReaders.length - maxAvatars;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 mt-0.5",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {allRead ? (
              <div className="flex items-center gap-1 text-[10px] text-primary">
                <CheckCheck className="w-3 h-3" />
                <span className="font-medium">Lu par tous</span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <CheckCheck className="w-3 h-3 text-primary mr-0.5" />
                <div className="flex -space-x-1.5">
                  {displayReaders.map((reader) => (
                    <div
                      key={reader.user_id}
                      className="w-4 h-4 rounded-full border border-background overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                    >
                      {reader.avatar_url ? (
                        <img
                          src={reader.avatar_url}
                          alt={reader.username || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[6px] text-white font-bold">
                          {reader.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {remaining > 0 && (
                  <span className="text-[9px] text-muted-foreground ml-0.5">
                    +{remaining}
                  </span>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs font-medium mb-1">
            Lu par {otherReaders.length} personne{otherReaders.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-0.5">
            {otherReaders.slice(0, 10).map(r => (
              <p key={r.user_id} className="text-xs text-muted-foreground">
                {r.username || 'Anonyme'}
              </p>
            ))}
            {otherReaders.length > 10 && (
              <p className="text-xs text-muted-foreground">
                et {otherReaders.length - 10} autres...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MessageReadReceipts;
