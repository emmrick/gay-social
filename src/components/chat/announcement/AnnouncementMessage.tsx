import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Megaphone, X } from 'lucide-react';
import { parseAnnouncement, renderInline } from '@/lib/announcement/markdown';
import LinkPreviewCard from './LinkPreviewCard';
import EmojiReactionPicker from '../EmojiReactionPicker';
import MessageReactions from '../MessageReactions';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface AnnouncementMessageProps {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string | null;
  timestamp: Date;
  reactions?: Reaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const AnnouncementMessage = ({
  id,
  content,
  senderName,
  senderAvatar,
  timestamp,
  reactions = [],
  onToggleReaction,
}: AnnouncementMessageProps) => {
  const parsed = useMemo(() => parseAnnouncement(content || ''), [content]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // URLs inline déjà rendues sous forme de bloc image / link card
  const imageUrls = new Set(
    parsed.blocks.filter((b) => b.type === 'image').map((b) => (b as any).url)
  );
  const previewUrls = parsed.detectedUrls.filter((u) => !imageUrls.has(u)).slice(0, 3);

  return (
    <>
      <article className="group/msg w-full max-w-2xl mx-auto">
        <div className="flex items-start gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
            {senderAvatar ? (
              <img src={senderAvatar} alt={senderName} className="w-full h-full rounded-xl object-cover" />
            ) : (
              <Megaphone className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{senderName}</span>
              <span className="text-[11px] text-muted-foreground">
                {format(timestamp, "d MMM 'à' HH:mm", { locale: fr })}
              </span>
            </div>
          </div>
        </div>

        <div className="ml-12 rounded-2xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent border border-amber-500/15 p-4 shadow-sm">
          <div className="space-y-3 text-[14.5px] leading-relaxed text-foreground">
            {parsed.blocks.map((block, i) => {
              if (block.type === 'image') {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxUrl(block.url)}
                    className="block w-full rounded-xl overflow-hidden bg-muted hover:opacity-95 transition-opacity"
                  >
                    <img
                      src={block.url}
                      alt={block.alt || 'Image annonce'}
                      loading="lazy"
                      className="w-full max-h-[480px] object-contain bg-black/5"
                    />
                  </button>
                );
              }
              return (
                <p key={i} className="whitespace-pre-wrap break-words">
                  {renderInline(block.children, `${id}-${i}`)}
                </p>
              );
            })}

            {previewUrls.length > 0 && (
              <div className="space-y-2 pt-1">
                {previewUrls.map((u) => (
                  <LinkPreviewCard key={u} url={u} />
                ))}
              </div>
            )}
          </div>

          {/* Reactions */}
          <div className={cn('flex items-center justify-between mt-2', reactions.length === 0 && 'mt-1')}>
            <div className="flex-1">
              {reactions.length > 0 && (
                <MessageReactions
                  reactions={reactions}
                  onToggleReaction={(emoji) => onToggleReaction?.(id, emoji)}
                  isOwn={false}
                />
              )}
            </div>
            <div className="opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity">
              <EmojiReactionPicker onSelect={(emoji) => onToggleReaction?.(id, emoji)} />
            </div>
          </div>
        </div>
      </article>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Image annonce"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default AnnouncementMessage;
