import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, MessageCircle, Send, Reply, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTweenComments, useCreateTweenComment, useToggleTweenLike, type Tween, type TweenComment } from '@/hooks/useTweens';

interface TweenDetailDialogProps {
  tween: Tween;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommentItem = ({ comment, tweenId, onReply }: { comment: TweenComment; tweenId: string; onReply: (id: string, username: string) => void }) => {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr });

  return (
    <div className="py-3">
      <div className="flex gap-2.5">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profiles?.avatar_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {comment.profiles?.username?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs">{comment.profiles?.username || 'Anonyme'}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <button
            className="text-xs text-muted-foreground hover:text-primary mt-1 flex items-center gap-1"
            onClick={() => onReply(comment.id, comment.profiles?.username || 'Anonyme')}
          >
            <Reply className="w-3 h-3" />
            Répondre
          </button>

          {/* Nested replies */}
          {comment.replies?.map(reply => (
            <div key={reply.id} className="ml-4 mt-2 pl-3 border-l-2 border-border">
              <CommentItem comment={reply} tweenId={tweenId} onReply={onReply} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TweenDetailDialog = ({ tween, open, onOpenChange }: TweenDetailDialogProps) => {
  const { user, profile } = useAuth();
  const { data: comments, isLoading } = useTweenComments(open ? tween.id : undefined);
  const createComment = useCreateTweenComment();
  const toggleLike = useToggleTweenLike();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    await createComment.mutateAsync({
      tweenId: tween.id,
      content: commentText.trim(),
      parentCommentId: replyTo?.id,
    });
    setCommentText('');
    setReplyTo(null);
  };

  const tweenProfile = tween.profiles;
  const timeAgo = formatDistanceToNow(new Date(tween.created_at), { addSuffix: true, locale: fr });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] p-0 rounded-2xl max-h-[85vh] flex flex-col">
        {/* Tween content */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={tweenProfile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {tweenProfile?.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{tweenProfile?.username || 'Anonyme'}</span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words">{tween.content}</p>

              {tween.media_url && tween.media_type === 'image' && (
                <img src={tween.media_url} alt="" className="w-full rounded-xl mt-3 max-h-64 object-cover" />
              )}
              {tween.media_url && tween.media_type === 'video' && (
                <video src={tween.media_url} controls className="w-full rounded-xl mt-3 max-h-64" />
              )}

              <div className="flex items-center gap-6 mt-3">
                <button
                  className={cn(
                    "flex items-center gap-1.5 text-sm transition-colors",
                    tween.user_has_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                  )}
                  onClick={() => toggleLike.mutate({ tweenId: tween.id, isLiked: !!tween.user_has_liked })}
                >
                  <Heart className={cn("w-[18px] h-[18px]", tween.user_has_liked && "fill-current")} />
                  <span className="font-medium">{tween.likes_count}</span>
                </button>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageCircle className="w-[18px] h-[18px]" />
                  <span className="font-medium">{tween.comments_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 divide-y divide-border">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : comments?.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun commentaire. Soyez le premier !</p>
            ) : (
              comments?.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  tweenId={tween.id}
                  onReply={(id, username) => setReplyTo({ id, username })}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment input */}
        {user && (
          <div className="border-t border-border p-3">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Reply className="w-3 h-3" />
                <span>Réponse à {replyTo.username}</span>
                <button onClick={() => setReplyTo(null)}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {profile?.username?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <input
                type="text"
                placeholder="Écrire un commentaire..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={500}
              />
              <Button
                size="icon"
                className="rounded-full w-9 h-9"
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || createComment.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TweenDetailDialog;
