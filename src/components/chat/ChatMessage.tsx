import { useState } from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Reply, CornerUpLeft, Flag, Trash2, Loader2 } from 'lucide-react';
import EphemeralMessage from './EphemeralMessage';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageReactions from './MessageReactions';
import ReportMessageDialog from './ReportMessageDialog';
import MentionHighlight from './MentionHighlight';
import { Button } from '@/components/ui/button';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';
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
  chatRoomId?: string;
  onReply?: (message: { id: string; content: string; senderName: string }) => void;
  onAvatarClick?: (userId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const ChatMessage = ({ 
  message, 
  isOwn, 
  isHighlighted, 
  reactions = [],
  chatRoomId,
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

  return (
    <>
      <div 
        className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-slide-up ${
          isHighlighted ? 'bg-primary/10 -mx-4 px-4 py-2 rounded-lg' : ''
        }`}
        id={`message-${message.id}`}
      >
        {/* Avatar */}
        {!isOwn && (
          <button
            onClick={handleAvatarClick}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 hover:scale-105 transition-transform cursor-pointer overflow-hidden"
          >
            {message.senderAvatar ? (
              <img
                src={message.senderAvatar}
                alt={message.senderName}
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              message.senderName.charAt(0).toUpperCase()
            )}
          </button>
        )}
        
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
          {/* Sender name */}
          {!isOwn && (
            <span className="text-xs text-muted-foreground mb-1 px-1">
              {message.senderName}
            </span>
          )}

          {/* Reply reference */}
          {message.replyToMessage && (
            <div 
              className={`flex items-center gap-1 text-xs text-muted-foreground mb-1 px-2 py-1 rounded bg-secondary/50 border-l-2 border-primary cursor-pointer hover:bg-secondary/80 transition-colors ${
                isOwn ? 'ml-auto' : ''
              }`}
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
          
          {/* Message content */}
          <div className="relative flex items-center gap-1">
            {/* Action buttons - left side for own messages */}
            {isOwn && !isEphemeral && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Supprimer ce message"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
                <EmojiReactionPicker onSelect={handleReaction} />
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
            ) : (
              <div className={`message-bubble ${isOwn ? 'message-bubble-sent' : 'message-bubble-received'}`}>
                <MentionHighlight 
                  content={message.content} 
                  className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                />
              </div>
            )}

            {/* Action buttons - right side for received messages */}
            {!isOwn && !isEphemeral && (
              <div className="flex items-center gap-1">
                <EmojiReactionPicker onSelect={handleReaction} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleReply}
                >
                  <Reply className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setShowReportDialog(true)}
                  title="Signaler ce message"
                >
                  <Flag className="w-4 h-4" />
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
          
          {/* Timestamp */}
          <span className="text-[10px] text-muted-foreground mt-1 px-1">
            {format(message.timestamp, 'HH:mm', { locale: fr })}
          </span>
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
