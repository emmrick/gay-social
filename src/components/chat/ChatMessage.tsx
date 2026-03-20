import { useState } from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Reply, CornerUpLeft, Flag, Trash2, Loader2, Check, CheckCheck } from 'lucide-react';
import EphemeralMessage from './EphemeralMessage';
import EmojiMessageEffect, { isEmojiOnlyMessage } from './EmojiMessageEffect';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageReactions from './MessageReactions';
import ReportMessageDialog from './ReportMessageDialog';
import MentionHighlight from './MentionHighlight';
import { Button } from '@/components/ui/button';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ReplyToMessage {
  id: string;
  content: string;
  senderUsername: string;
}

interface ReadReceipt {
  user_id: string;
  read_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface ChatMessageProps {
  message: Message & { replyToMessage?: ReplyToMessage | null };
  isOwn: boolean;
  isHighlighted?: boolean;
  reactions?: Reaction[];
  readers?: ReadReceipt[];
  totalMembers?: number;
  chatRoomId?: string;
  /** Whether this is the last message in a group of consecutive messages from the same sender */
  isLastInGroup?: boolean;
  /** Whether this is the last own message overall — controls read receipt display */
  isLastOwnMessage?: boolean;
  onReply?: (message: { id: string; content: string; senderName: string }) => void;
  onAvatarClick?: (userId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const ChatMessage = ({ 
  message, 
  isOwn, 
  isHighlighted, 
  reactions = [],
  readers = [],
  totalMembers,
  chatRoomId,
  isLastInGroup = true,
  isLastOwnMessage = false,
  onReply, 
  onAvatarClick,
  onToggleReaction,
}: ChatMessageProps) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteMessage, isDeleting } = useDeleteMessage();
  const isEphemeral = message.type === 'image' || message.type === 'video';

  const handleReply = () => {
    onReply?.({
      id: message.id,
      content: message.content,
      senderName: message.senderName,
    });
  };

  const handleAvatarClick = () => {
    onAvatarClick?.(message.senderId);
  };

  const handleDelete = async () => {
    await deleteMessage(message.id);
    setShowDeleteDialog(false);
  };

  const handleReaction = (emoji: string) => {
    onToggleReaction?.(message.id, emoji);
  };

  // Determine read status from readers array for groups
  const otherReaders = readers.filter(r => r.user_id !== message.senderId);
  const hasBeenRead = otherReaders.length > 0;
  const allRead = totalMembers ? otherReaders.length >= (totalMembers - 1) : hasBeenRead;

  return (
    <>
      <div
        className={cn(
          "flex items-end gap-2",
          isOwn ? "justify-end" : "justify-start",
          isLastInGroup ? "mb-2" : "mb-px",
          isHighlighted && "bg-primary/10 -mx-3 px-3 py-1.5 rounded-lg"
        )}
        id={`message-${message.id}`}
      >
        {/* Avatar for received — only last in group */}
        {!isOwn && (
          <div className="flex-shrink-0 w-7">
            {isLastInGroup ? (
              <button
                onClick={handleAvatarClick}
                className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              >
                {message.senderAvatar ? (
                  <img
                    src={message.senderAvatar}
                    alt={message.senderName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs font-semibold text-primary">
                    {message.senderName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}
          </div>
        )}

        <div className={cn("max-w-[78%] flex flex-col", isOwn ? "items-end" : "items-start")}>
          {/* Sender name — only for received, first in group */}
          {!isOwn && isLastInGroup && (
            <span className="text-[11px] text-muted-foreground mb-0.5 px-1 font-medium">
              {message.senderName}
            </span>
          )}

          {/* Reply reference */}
          {message.replyToMessage && (
            <div 
              className={cn(
                "flex items-center gap-1 text-xs text-muted-foreground mb-1 px-2 py-1 rounded bg-secondary/50 border-l-2 border-primary cursor-pointer hover:bg-secondary/80 transition-colors",
                isOwn && "ml-auto"
              )}
              onClick={() => {
                const el = document.getElementById(`message-${message.replyToMessage?.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <CornerUpLeft className="w-3 h-3" />
              <span className="font-medium">{message.replyToMessage.senderUsername}</span>
              <span className="truncate max-w-[150px]">{message.replyToMessage.content}</span>
            </div>
          )}

          {/* Bubble + reaction picker */}
          <div className="group/msg relative flex items-center gap-1">
            {/* Action buttons - left side for own messages */}
            {isOwn && !isEphemeral && (
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Supprimer ce message"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
                <div className="hidden md:block opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  <EmojiReactionPicker onSelect={handleReaction} />
                </div>
              </div>
            )}

            {isEphemeral ? (
              <EphemeralMessage
                messageId={message.id}
                messageType={message.type as 'image' | 'video'}
                senderName={message.senderName}
                isOwn={isOwn}
                chatRoomId={chatRoomId}
              />
            ) : isEmojiOnlyMessage(message.content) ? (
              <EmojiMessageEffect content={message.content} isOwn={isOwn} messageId={message.id} />
            ) : (
              <div
                className={cn(
                  "px-4 py-2 pb-5 text-[14.5px] leading-[1.45] whitespace-pre-wrap break-words rounded-[20px] relative",
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-[6px] shadow-[0_1px_3px_hsl(215_85%_45%/0.15)]"
                    : "bg-secondary text-foreground rounded-bl-[6px] shadow-[0_1px_2px_hsl(220_30%_20%/0.06)]",
                )}
                style={{ wordBreak: 'break-word' }}
              >
                <MentionHighlight 
                  content={message.content} 
                  className="text-sm leading-relaxed"
                />
                <span className={cn(
                  "absolute bottom-1 right-3 text-[10px] leading-none",
                  isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {format(message.timestamp, 'HH:mm', { locale: fr })}
                </span>
              </div>
            )}

            {/* Action buttons - right side for received messages */}
            {!isOwn && !isEphemeral && (
              <div className="flex items-center gap-0.5">
                <div className="hidden md:block opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  <EmojiReactionPicker onSelect={handleReaction} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                  onClick={handleReply}
                >
                  <Reply className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setShowReportDialog(true)}
                  title="Signaler ce message"
                >
                  <Flag className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Reactions */}
          <MessageReactions
            reactions={reactions}
            onToggleReaction={handleReaction}
            isOwn={isOwn}
          />

          {/* Read receipt — Google Messages style: only on last own message */}
          {isLastInGroup && isLastOwnMessage && isOwn && (
            <div className="flex items-center gap-0.5 mt-0.5 px-1 justify-end">
              {allRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
              ) : hasBeenRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Check className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <ReportMessageDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        messageId={message.id}
        messageContent={message.content}
        senderId={message.senderId}
        senderUsername={message.senderName}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le message sera supprimé de la conversation. Pour des raisons de sécurité, 
              il restera accessible aux modérateurs en cas de signalement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChatMessage;