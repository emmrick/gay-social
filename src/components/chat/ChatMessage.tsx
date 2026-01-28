import { Message } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EphemeralMessage from './EphemeralMessage';

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

const ChatMessage = ({ message, isOwn }: ChatMessageProps) => {
  const isEphemeral = message.type === 'image' || message.type === 'video';

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {message.senderName.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.senderName}
          </span>
        )}
        
        {/* Message content */}
        {isEphemeral ? (
          <EphemeralMessage
            messageId={message.id}
            messageType={message.type as 'image' | 'video'}
            senderName={message.senderName}
            isOwn={isOwn}
          />
        ) : (
          <div className={`message-bubble ${isOwn ? 'message-bubble-sent' : 'message-bubble-received'}`}>
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        )}
        
        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {format(message.timestamp, 'HH:mm', { locale: fr })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
