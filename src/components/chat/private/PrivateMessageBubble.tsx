import { memo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, CheckCheck, AlertTriangle } from 'lucide-react';
import EmojiMessageEffect, { isEmojiOnlyMessage } from '../EmojiMessageEffect';
import EmojiReactionPicker from '../EmojiReactionPicker';
import MessageReactions from '../MessageReactions';
import EphemeralMessage from '../EphemeralMessage';
import EphemeralMessageRow from '../EphemeralMessageRow';
import RegularMediaMessage from '../RegularMediaMessage';
import SharedAlbumMessage from '../SharedAlbumMessage';
import AlbumAccessRequestMessage from '../AlbumAccessRequestMessage';
import CreditRequestMessage from '../CreditRequestMessage';
import GiftMessage from '../GiftMessage';
import { cn } from '@/lib/utils';

interface PrivateMessageBubbleProps {
  message: any;
  isOwn: boolean;
  isLastInGroup: boolean;
  isLastOwnMessage: boolean;
  otherUserProfile: any;
  resolvedOtherAvatar: string | null;
  otherUserId: string;
  onToggleReaction: (messageId: string, emoji: string) => void;
  getReactionsForMessage: (messageId: string) => any[];
}

const PrivateMessageBubble = ({
  message,
  isOwn,
  isLastInGroup,
  isLastOwnMessage,
  otherUserProfile,
  resolvedOtherAvatar,
  otherUserId,
  onToggleReaction,
  getReactionsForMessage,
}: PrivateMessageBubbleProps) => {
  const isEphemeralMedia = (message.message_type === 'image' || message.message_type === 'video') && message.content && !message.content.startsWith('http');
  const isRegularMedia = (message.message_type === 'image' || message.message_type === 'video') && message.content && message.content.startsWith('http');
  const isAlbumShare = message.message_type === 'album_share';
  const isAlbumAccessRequest = message.message_type === 'album_access_request';
  const isCreditRequest = message.message_type === 'credit_request';
  const isCreditGift = message.message_type === 'credit_gift';
  const isSystemScreenshot = message.message_type === 'system_screenshot';
  const isSystemExternalWarning = message.message_type === 'system_external_warning';

  let albumShareData: any = null;
  if (isAlbumShare && message.content) {
    try {
      const parsed = JSON.parse(message.content);
      albumShareData = parsed.shareId ? parsed : parsed.data || null;
    } catch { /* ignore */ }
  }

  let albumAccessRequestData: any = null;
  if (isAlbumAccessRequest && message.content) {
    try {
      albumAccessRequestData = JSON.parse(message.content);
    } catch { /* ignore */ }
  }

  if (isSystemExternalWarning) {
    return (
      <div className="flex justify-center my-3">
        <div className="max-w-[90%] bg-yellow-500/10 border border-yellow-500/40 rounded-xl px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">Sécurité — message automatique</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {message.content?.split(/(\*\*[^*]+\*\*)/g).map((seg: string, j: number) =>
              seg.startsWith('**') && seg.endsWith('**')
                ? <strong key={j} className="font-semibold text-yellow-700 dark:text-yellow-300">{seg.slice(2, -2)}</strong>
                : <span key={j}>{seg}</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </p>
        </div>
      </div>
    );
  }

  if (isSystemScreenshot) {
    return (
      <div className="flex justify-center my-3">
        <div className="max-w-[90%] bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs font-bold text-destructive">Capture d'écran détectée</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {message.content?.split('\n\n').map((part: string, i: number) => (
              <span key={i}>{i > 0 && <><br/><br/></>}{
                part.split(/(\*\*[^*]+\*\*)/g).map((seg: string, j: number) =>
                  seg.startsWith('**') && seg.endsWith('**')
                    ? <strong key={j} className="font-semibold text-destructive">{seg.slice(2, -2)}</strong>
                    : <span key={j}>{seg.replace(/⚠️ |🚨 /g, '')}</span>
                )
              }</span>
            ))}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </p>
        </div>
      </div>
    );
  }

  const bubbleContent = isEphemeralMedia ? (
    <EphemeralMessageRow messageId={message.id} senderId={message.sender_id}>
      <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start", isLastInGroup ? "mb-2" : "mb-px")}>
        {!isOwn && (
          <div className="flex-shrink-0 w-7">
            {isLastInGroup && resolvedOtherAvatar ? (
              <img src={resolvedOtherAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : isLastInGroup ? (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                {otherUserProfile?.username?.charAt(0).toUpperCase()}
              </div>
            ) : <div className="w-7" />}
          </div>
        )}
        <div className={cn("max-w-[78%]", isOwn ? "items-end" : "items-start")}>
          <EphemeralMessage
            messageId={message.id}
            messageType={message.message_type as 'image' | 'video'}
            senderName={message.senderUsername}
            senderAvatar={isOwn ? undefined : otherUserProfile?.avatar_url}
            isOwn={isOwn}
            recipientId={otherUserId}
          />
        </div>
      </div>
    </EphemeralMessageRow>
  ) : (
    <div className={cn(
      "flex items-end gap-2",
      isOwn ? "justify-end" : "justify-start",
      isLastInGroup ? "mb-2" : "mb-px"
    )}>
      {/* Avatar for received — only last in group */}
      {!isOwn && (
        <div className="flex-shrink-0 w-7">
          {isLastInGroup && resolvedOtherAvatar ? (
            <img src={resolvedOtherAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : isLastInGroup ? (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
              {otherUserProfile?.username?.charAt(0).toUpperCase()}
            </div>
          ) : <div className="w-7" />}
        </div>
      )}

      <div className={cn("max-w-[78%] flex flex-col", isOwn ? "items-end" : "items-start")}>
        <div className="group/msg relative flex items-center gap-1">
          {isOwn && !isEphemeralMedia && (
            <div className="hidden md:block opacity-0 group-hover/msg:opacity-100 transition-opacity">
              <EmojiReactionPicker onSelect={(emoji) => onToggleReaction(message.id, emoji)} />
            </div>
          )}

          {isAlbumAccessRequest && albumAccessRequestData ? (
            <AlbumAccessRequestMessage
              albumIds={albumAccessRequestData.albumIds}
              albumNames={albumAccessRequestData.albumNames}
              requesterId={albumAccessRequestData.requesterId}
              isOwn={isOwn}
              messageId={message.id}
            />
          ) : isAlbumShare && albumShareData ? (
            <SharedAlbumMessage
              shareId={albumShareData.shareId}
              albumId={albumShareData.albumId}
              albumName={albumShareData.albumName}
              expiresAt={albumShareData.expiresAt}
              sharedByUserId={message.sender_id}
              isOwn={isOwn}
            />
          ) : isCreditRequest ? (
            <CreditRequestMessage
              messageId={message.id}
              content={message.content || ''}
              senderId={message.sender_id}
              isOwn={isOwn}
            />
          ) : isCreditGift ? (() => {
            let giftData = { amount: 0 };
            try { giftData = JSON.parse(message.content || '{}'); } catch {}
            return (
              <GiftMessage
                amount={giftData.amount || 0}
                senderName={message.senderUsername}
                recipientName={otherUserProfile?.username || ''}
                isOwn={isOwn}
              />
            );
          })() : isRegularMedia ? (
            <RegularMediaMessage
              mediaUrl={message.content!}
              mediaType={message.message_type as 'image' | 'video'}
              isOwn={isOwn}
            />
          ) : isEmojiOnlyMessage(message.content || '') ? (
            <EmojiMessageEffect content={message.content!} isOwn={isOwn} messageId={message.id} />
          ) : (
            <div
              className={cn(
                "px-[14px] py-[8px] pb-[18px] text-[15px] leading-[1.4] whitespace-pre-wrap break-words rounded-[22px] relative transition-transform",
                "active:scale-[0.99]",
                isOwn
                  ? cn(
                      "text-primary-foreground rounded-br-[7px]",
                      "bg-gradient-to-br from-primary via-primary to-primary/90",
                      "shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.35),0_1px_2px_hsl(var(--primary)/0.2)]",
                    )
                  : cn(
                      "text-foreground rounded-bl-[7px]",
                      "bg-secondary/95 backdrop-blur-sm",
                      "shadow-[0_1px_3px_hsl(220_30%_20%/0.06),0_0_0_0.5px_hsl(var(--border)/0.6)]",
                    ),
              )}
              style={{ wordBreak: 'break-word' }}
            >
              {message.content}
              <span className={cn(
                "absolute bottom-1 right-3 text-[10px] leading-none font-medium tabular-nums",
                isOwn ? "text-primary-foreground/65" : "text-muted-foreground/70"
              )}>
                {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
              </span>
            </div>
          )}

          {!isOwn && !isEphemeralMedia && (
            <div className="hidden md:block opacity-0 group-hover/msg:opacity-100 transition-opacity">
              <EmojiReactionPicker onSelect={(emoji) => onToggleReaction(message.id, emoji)} />
            </div>
          )}
        </div>

        {/* Reactions */}
        <MessageReactions
          reactions={getReactionsForMessage(message.id)}
          onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
          isOwn={isOwn}
        />

        {/* Read receipt */}
        {isLastInGroup && isLastOwnMessage && (
          <div className="flex items-center gap-0.5 mt-0.5 px-1 justify-end">
            {message.read_at ? (
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Check className="w-3.5 h-3.5 text-muted-foreground/50" />
            )}
          </div>
        )}
      </div>
    </div>
  );

  return bubbleContent;
};

// Memoize to prevent re-renders of the entire message list when typing,
// when a new message arrives, or when an unrelated reaction changes.
const areEqual = (prev: PrivateMessageBubbleProps, next: PrivateMessageBubbleProps) => {
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.content !== next.message.content) return false;
  if (prev.message.read_at !== next.message.read_at) return false;
  if (prev.isOwn !== next.isOwn) return false;
  if (prev.isLastInGroup !== next.isLastInGroup) return false;
  if (prev.isLastOwnMessage !== next.isLastOwnMessage) return false;
  if (prev.resolvedOtherAvatar !== next.resolvedOtherAvatar) return false;
  const a = prev.getReactionsForMessage(prev.message.id);
  const b = next.getReactionsForMessage(next.message.id);
  if ((a?.length || 0) !== (b?.length || 0)) return false;
  if (a && b) {
    for (let i = 0; i < a.length; i++) {
      if (!b[i] || a[i].emoji !== b[i].emoji || a[i].count !== b[i].count || a[i].hasReacted !== b[i].hasReacted) return false;
    }
  }
  return true;
};

export default memo(PrivateMessageBubble, areEqual);
