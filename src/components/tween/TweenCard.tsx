import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Flag } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleTweenLike, useDeleteTween, useVoteTweenPoll, type Tween } from '@/hooks/useTweens';
import TweenDetailDialog from './TweenDetailDialog';

interface TweenCardProps {
  tween: Tween;
}

const TweenPoll = ({ tween }: { tween: Tween }) => {
  const votePoll = useVoteTweenPoll();
  const options = tween.poll_options || [];
  const totalVotes = options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);

  return (
    <div className="mt-3 space-y-2">
      {options.map((opt: any, i: number) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); votePoll.mutate({ tweenId: tween.id, optionIndex: i }); }}
            className="w-full relative overflow-hidden rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted/50"
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex justify-between">
              <span className="font-medium">{opt.text}</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  );
};

const TweenCard = ({ tween }: TweenCardProps) => {
  const { user } = useAuth();
  const toggleLike = useToggleTweenLike();
  const deleteTween = useDeleteTween();
  const [showDetail, setShowDetail] = useState(false);

  const isOwn = user?.id === tween.user_id;
  const profile = tween.profiles;
  const timeAgo = formatDistanceToNow(new Date(tween.created_at), { addSuffix: true, locale: fr });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike.mutate({ tweenId: tween.id, isLiked: !!tween.user_has_liked });
  };

  return (
    <>
      <article
        className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {profile?.username?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm truncate">{profile?.username || 'Anonyme'}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">· {timeAgo}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwn && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteTween.mutate(tween.id); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                  {!isOwn && (
                    <DropdownMenuItem>
                      <Flag className="w-4 h-4 mr-2" />
                      Signaler
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <p className="mt-1 text-sm whitespace-pre-wrap break-words">{tween.content}</p>

            {/* Media */}
            {tween.media_url && tween.media_type === 'image' && (
              <img src={tween.media_url} alt="" className="w-full rounded-xl mt-3 max-h-80 object-cover" loading="lazy" />
            )}
            {tween.media_url && tween.media_type === 'video' && (
              <video src={tween.media_url} controls className="w-full rounded-xl mt-3 max-h-80 object-cover" />
            )}

            {/* Poll */}
            {tween.has_poll && tween.poll_options && <TweenPoll tween={tween} />}

            {/* Action buttons */}
            <div className="flex items-center gap-6 mt-3 -ml-2">
              <button
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-lg",
                  tween.user_has_liked
                    ? "text-destructive"
                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                )}
                onClick={handleLike}
              >
                <Heart className={cn("w-[18px] h-[18px]", tween.user_has_liked && "fill-current")} />
                <span className="font-medium">{tween.likes_count || ''}</span>
              </button>

              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
              >
                <MessageCircle className="w-[18px] h-[18px]" />
                <span className="font-medium">{tween.comments_count || ''}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {showDetail && (
        <TweenDetailDialog
          tween={tween}
          open={showDetail}
          onOpenChange={setShowDetail}
        />
      )}
    </>
  );
};

export default TweenCard;
