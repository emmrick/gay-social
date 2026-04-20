import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Flag, Pencil, Bookmark } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToggleTweenLike, useDeleteTween, useVoteTweenPoll, type Tween } from '@/hooks/useTweens';
import { useTweenFavoriteIds, useToggleTweenFavorite } from '@/hooks/useTweenFavorites';
import TweenDetailDialog from './TweenDetailDialog';
import TweenEditDialog from './TweenEditDialog';
import TweenReportDialog from './TweenReportDialog';
import TweenFollowButton from './TweenFollowButton';
import TweenMedia from './TweenMedia';
import { motion } from 'framer-motion';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

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
            className="w-full relative overflow-hidden rounded-xl border border-border/50 p-3 text-left text-sm transition-all hover:border-primary/30 hover:bg-primary/5 group"
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/15 to-primary/5 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex justify-between">
              <span className="font-medium">{opt.text}</span>
              <span className="text-muted-foreground font-semibold">{pct}%</span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground font-medium">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  );
};

const renderBoldText = (text: string) => {
  if (!text.includes('**')) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

const TweenCard = ({ tween }: TweenCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleLike = useToggleTweenLike();
  const deleteTween = useDeleteTween();
  const { data: favoriteIds } = useTweenFavoriteIds();
  const toggleFavorite = useToggleTweenFavorite();
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const isOwn = user?.id === tween.user_id;
  const isFavorited = favoriteIds?.has(tween.id) ?? false;
  const profile = tween.profiles;
  const resolvedAvatar = useAvatarUrl(profile?.avatar_url);
  const timeAgo = formatDistanceToNow(new Date(tween.created_at), { addSuffix: true, locale: fr });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike.mutate({ tweenId: tween.id, isLiked: !!tween.user_has_liked });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ tweenId: tween.id, isFavorited });
  };

  return (
    <>
      <article className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/15 transition-all duration-300">
        <div className="flex gap-3">
          <Avatar
            className="w-10 h-10 flex-shrink-0 cursor-pointer ring-2 ring-primary/10 hover:ring-primary/25 transition-all"
            onClick={(e) => { e.stopPropagation(); if (profile?.user_id) navigate(`/profile/${profile.user_id}`); }}
          >
            <AvatarImage src={resolvedAvatar || ''} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {profile?.username?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="font-bold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={(e) => { e.stopPropagation(); if (profile?.user_id) navigate(`/profile/${profile.user_id}`); }}
                >{profile?.username || 'Anonyme'}</span>
                {!isOwn && profile?.user_id && (
                  <TweenFollowButton targetUserId={profile.user_id} variant="compact" />
                )}
                <span className="text-xs text-muted-foreground/60 flex-shrink-0">· {timeAgo}</span>
                {tween.edited_at && (
                  <span className="text-[10px] text-muted-foreground/50 italic flex-shrink-0">(modifié)</span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground/50 hover:text-foreground" onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {isOwn && (
                    <>
                      <DropdownMenuItem
                        className="rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive rounded-lg"
                        onClick={(e) => { e.stopPropagation(); deleteTween.mutate(tween.id); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isOwn && (
                    <DropdownMenuItem
                      className="rounded-lg text-destructive"
                      onClick={(e) => { e.stopPropagation(); setShowReport(true); }}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Signaler
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <p className="mt-1.5 text-sm whitespace-pre-wrap break-words leading-relaxed">{renderBoldText(tween.content)}</p>

            {/* Media */}
            {tween.media_url && tween.media_type === 'image' && (
              <img src={tween.media_url} alt="" className="w-full rounded-xl mt-3 max-h-80 object-cover border border-border/20" loading="lazy" />
            )}
            {tween.media_url && tween.media_type === 'video' && (
              <video src={tween.media_url} controls className="w-full rounded-xl mt-3 max-h-80 object-cover border border-border/20" />
            )}

            {/* Poll */}
            {tween.has_poll && tween.poll_options && <TweenPoll tween={tween} />}

            {/* Action buttons */}
            <div className="flex items-center gap-1 mt-3 -ml-2">
              <motion.button
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-all px-3 py-1.5 rounded-xl",
                  tween.user_has_liked
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
                onClick={handleLike}
              >
                <Heart className={cn("w-[18px] h-[18px] transition-transform", tween.user_has_liked && "fill-current scale-110")} />
                <span className="font-semibold text-xs">{tween.likes_count || ''}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-all px-3 py-1.5 rounded-xl hover:bg-primary/5"
                onClick={() => setShowDetail(true)}
              >
                <MessageCircle className="w-[18px] h-[18px]" />
                <span className="font-semibold text-xs">{tween.comments_count || ''}</span>
              </motion.button>
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

      {showEdit && (
        <TweenEditDialog
          tween={tween}
          open={showEdit}
          onOpenChange={setShowEdit}
        />
      )}

      {showReport && (
        <TweenReportDialog
          tween={tween}
          open={showReport}
          onOpenChange={setShowReport}
        />
      )}
    </>
  );
};

export default TweenCard;
