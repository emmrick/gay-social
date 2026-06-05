import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Crown, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLivePresence } from '@/hooks/useLivePresence';
import { useAvatarUrl, getSignedAvatarUrl } from '@/hooks/useAvatarUrl';
import { useInView } from '@/hooks/useInView';
import { useIsPlanNowActive } from '@/hooks/usePlanNowSession';
import PlanNowBadge from '@/components/plan-now/PlanNowBadge';


interface ProfileCardProps {
  profile: {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    age: number | null;
    is_online: boolean | null;
    last_seen: string | null;
    distance_km: number | null;
    bio: string | null;
    region: string;
    hide_online_status?: boolean | null;
    isCurrentUser?: boolean;
    is_verified?: boolean;
    created_at?: string;
  };
  index: number;
  onViewProfile: (userId: string) => void;
  onLike?: (userId: string) => void;
}

const isNewUser = (createdAt?: string) => {
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
};

const ProfileCard = memo(({ profile, index, onViewProfile, onLike }: ProfileCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const live = useLivePresence(profile);
  const isOnline = live.showIndicator;
  const lastSeen = live.lastSeenText;
  const isNew = isNewUser(profile.created_at);
  const isPlanNow = useIsPlanNowActive(profile.user_id);
  // First 6 cards (above the fold) load eagerly. The rest use a two-stage
  // gate: a wide "prefetch" window (~1200px) warms the signed URL and the
  // browser image cache; a tighter "render" window (~400px) actually mounts
  // the <img> so the byte stream is already in cache by then.
  const eager = index < 6;
  const { ref: cardRef, inView: nearViewport } = useInView<HTMLDivElement>({
    rootMargin: '400px',
    skip: eager,
  });
  const { ref: prefetchRef, inView: prefetchInView } = useInView<HTMLDivElement>({
    rootMargin: '1200px',
    skip: eager,
  });
  const shouldPrefetch = eager || prefetchInView;
  const shouldLoadAvatar = eager || nearViewport;
  const resolvedAvatar = useAvatarUrl(shouldPrefetch ? profile.avatar_url : null);

  // Warm the browser HTTP cache as soon as we enter the prefetch window,
  // even before we render the <img>. By the time the card scrolls into the
  // render window, the image is already decoded and shows instantly.
  useEffect(() => {
    if (!shouldPrefetch || !profile.avatar_url) return;
    let cancelled = false;
    void getSignedAvatarUrl(profile.avatar_url).then((url) => {
      if (cancelled || !url) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    });
    return () => { cancelled = true; };
  }, [shouldPrefetch, profile.avatar_url]);

  // Reset image state when the resolved URL changes (e.g. signed URL refresh)
  // so a transient load error doesn't permanently hide the avatar.
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [resolvedAvatar]);


  const handleClick = () => {
    navigate(`/profile/${profile.user_id}`);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(true);
    onLike?.(profile.user_id);
    if (navigator.vibrate) navigator.vibrate(30);
    setTimeout(() => setLiked(false), 1200);
  };

  return (
    <motion.div
      ref={(el) => {
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (prefetchRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35, ease: 'easeOut' }}
      className="group relative"
    >
      <button
        onClick={handleClick}
        className={cn(
          "relative w-full aspect-[3/4] rounded-2xl overflow-hidden",
          "bg-card/50 border transition-all duration-200",
          profile.isCurrentUser
            ? "border-primary/40 ring-2 ring-primary/20 shadow-lg shadow-primary/10"
            : "border-border/20 hover:border-primary/25 hover:shadow-md active:scale-[0.98]"
        )}
      >
        {/* Image */}
        <div className="absolute inset-0">
          {!shouldLoadAvatar ? (
            // Lightweight placeholder while card is far from viewport
            <div className="absolute inset-0 bg-muted/60 animate-pulse" />
          ) : resolvedAvatar && !imgError ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              <img
                src={resolvedAvatar}
                alt={profile.username}
                loading={eager ? 'eager' : 'lazy'}
                fetchPriority={index < 4 ? 'high' : 'auto'}
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
              <span className="text-4xl font-black text-primary/40" style={{ fontFamily: 'Syne, sans-serif' }}>
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>


        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent h-16" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10">
          <div className="flex flex-col gap-1">
            {profile.isCurrentUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold shadow-sm">
                <Crown className="w-3 h-3" />
                Toi
              </span>
            )}
            {isNew && !profile.isCurrentUser && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/80 backdrop-blur-md text-primary-foreground text-[10px] font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                Nouveau
              </span>
            )}
            {isPlanNow && <PlanNowBadge size="xs" withLabel />}
          </div>

          {!profile.isCurrentUser && (
            <div className="flex items-center">
              {isOnline ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white/30 shadow-sm" />
                </span>
              ) : !profile.hide_online_status ? (
                <span className="w-3 h-3 rounded-full bg-muted-foreground/30 border border-white/20" />
              ) : null}
            </div>
          )}
        </div>

        {/* Like animation */}
        {liked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-primary/10"
          >
            <Heart className="w-16 h-16 text-primary fill-primary drop-shadow-lg" />
          </motion.div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm truncate">
              {profile.username}
            </span>
            {profile.age && (
              <span className="text-white/70 text-xs font-medium">{profile.age}</span>
            )}
            {profile.is_verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )}
          </div>

          {profile.isCurrentUser ? (
            <p className="text-primary-foreground/60 text-[10px] mt-0.5 font-medium">Voir ton profil</p>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-white/50 mt-0.5">
              {isOnline ? (
                <span className="text-green-400 font-semibold">En ligne</span>
              ) : (
                <span>{lastSeen}</span>
              )}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        {!profile.isCurrentUser && (
          <div className="absolute inset-0 bg-primary/8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        )}
      </button>
    </motion.div>
  );
});

ProfileCard.displayName = 'ProfileCard';

export default ProfileCard;
