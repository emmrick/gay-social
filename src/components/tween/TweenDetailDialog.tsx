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
import { motion } from 'framer-motion';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

interface TweenDetailDialogProps {
  tween: Tween;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommentItem = ({ comment, tweenId, onReply }: { comment: TweenComment; tweenId: string; onReply: (id: string, username: string) => void }) => {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr });
  const resolvedAvatar = useAvatarUrl(comment.profiles?.avatar_url);

  return (
    <div className="py-3">
      <div className="flex gap-2.5">
        <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-primary/10">
          <AvatarImage src={resolvedAvatar || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {comment.profiles?.username?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs">{comment.profiles?.username || 'Anonyme'}</span>
            <span className="text-[11px] text-muted-foreground/60">{timeAgo}</span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{comment.content}</p>
          <button
            className="text-xs text-muted-foreground/60 hover:text-primary mt-1 flex items-center gap-1 transition-colors"
            onClick={() => onReply(comment.id, comment.profiles?.username || 'Anonyme')}
          >
            <Reply className="w-3 h-3" />
            Répondre
          </button>

          {/* Nested replies */}
          {comment.replies?.map(reply => (
            <div key={reply.id} className="ml-4 mt-2 pl-3 border-l-2 border-primary/10">
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
  const resolvedTweenAvatar = useAvatarUrl(tweenProfile?.avatar_url);
  const resolvedMyAvatar = useAvatarUrl(profile?.avatar_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] p-0 rounded-2xl max-h-[85vh] flex flex-col border-border/40">
        {/* Tween content */}
        <div className="p-4 border-b border-border/30">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-primary/10">
              <AvatarImage src={resolvedTweenAvatar || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {tweenProfile?.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{tweenProfile?.username || 'Anonyme'}</span>
                <span className="text-xs text-muted-foreground/60">{timeAgo}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words leading-relaxed">{tween.content}</p>

              {tween.media_url && tween.media_type === 'image' && (
                <img src={tween.media_url} alt="" className="w-full rounded-xl mt-3 max-h-64 object-cover border border-border/20" />
              )}
              {tween.media_url && tween.media_type === 'video' && (
                <video src={tween.media_url} controls className="w-full rounded-xl mt-3 max-h-64 border border-border/20" />
              )}

              <div className="flex items-center gap-1 mt-3">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    "flex items-center gap-1.5 text-sm transition-all px-3 py-1.5 rounded-xl",
                    tween.user_has_liked ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  onClick={() => toggleLike.mutate({ tweenId: tween.id, isLiked: !!tween.user_has_liked })}
                >
                  <Heart className={cn("w-[18px] h-[18px]", tween.user_has_liked && "fill-current")} />
                  <span className="font-semibold text-xs">{tween.likes_count}</span>
                </motion.button>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5">
                  <MessageCircle className="w-[18px] h-[18px]" />
                  <span className="font-semibold text-xs">{tween.comments_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 divide-y divide-border/30">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : comments?.length === 0 ? (
              <div className="py-10 text-center">
                <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun commentaire. Soyez le premier !</p>
              </div>
            ) : (
              comments?.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <CommentItem
                    comment={comment}
                    tweenId={tween.id}
                    onReply={(id, username) => setReplyTo({ id, username })}
                  />
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment input */}
        {user && (
          <div className="border-t border-border/30 p-3 bg-muted/5">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-xs text-primary/70 bg-primary/5 rounded-lg px-2.5 py-1.5">
                <Reply className="w-3 h-3" />
                <span>Réponse à <span className="font-semibold">{replyTo.username}</span></span>
                <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-primary/10">
                <AvatarImage src={resolvedMyAvatar || ''} />
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
                className="flex-1 bg-background border border-border/40 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                maxLength={500}
              />
              <Button
                size="icon"
                className="rounded-full w-9 h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-sm"
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
