import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Heart, Eye, Crown, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLivePresence } from '@/hooks/useLivePresence';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { formatDistance } from '@/lib/formatDistance';

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
  const live = useLivePresence(profile);
  const isOnline = live.showIndicator;
  const lastSeen = live.lastSeenText;
  const isNew = isNewUser(profile.created_at);
  const resolvedAvatar = useAvatarUrl(profile.avatar_url);

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
          {resolvedAvatar ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              <img
                src={resolvedAvatar}
                alt={profile.username}
                loading={index < 4 ? 'eager' : 'lazy'}
                fetchPriority={index < 4 ? 'high' : 'auto'}
                decoding="async"
                onLoad={() => setImgLoaded(true)}
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
            {!profile.isCurrentUser && profile.distance_km !== null && profile.distance_km > 0 && profile.distance_km < 0.1 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold shadow-sm animate-pulse">
                <Flame className="w-2.5 h-2.5" />
                Très proche
              </span>
            )}
            {!profile.isCurrentUser && (profile.distance_km !== null || profile.region) && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-medium max-w-[140px]">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">
                  {formatDistance(profile.distance_km) ?? 'Distance inconnue'}
                  {profile.distance_km !== null && profile.region && ` · ${profile.region}`}
                </span>
              </span>
            )}
            {isNew && !profile.isCurrentUser && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/80 backdrop-blur-md text-primary-foreground text-[10px] font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                Nouveau
              </span>
            )}
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
