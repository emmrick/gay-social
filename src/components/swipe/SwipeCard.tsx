import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { MapPin, Verified, Ruler, Scale, Heart, X, EyeOff, Flame, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';

interface SwipeCardProps {
  profile: {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    is_online: boolean | null;
    last_seen: string | null;
    hide_online_status?: boolean | null;
    region: string;
    is_verified: boolean;
    looking_for: string[] | null;
    sexual_position: string | null;
    height: number | null;
    weight: number | null;
    body_type: string | null;
    _isBoosted?: boolean;
  };
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
}

const SwipeCard = ({ profile, onSwipe, isTop }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const cardOpacity = useTransform(x, [-200, -100, 0, 100, 200], [0.7, 1, 1, 1, 0.7]);

  // Swipe indicators
  const likeOpacity = useTransform(x, [0, 60, 140], [0, 0.5, 1]);
  const likeScale = useTransform(x, [0, 60, 140], [0.6, 0.85, 1.1]);
  const nopeOpacity = useTransform(x, [-140, -60, 0], [1, 0.5, 0]);
  const nopeScale = useTransform(x, [-140, -60, 0], [1.1, 0.85, 0.6]);
  const hideOpacity = useTransform(y, [-140, -60, 0], [1, 0.5, 0]);
  const hideScale = useTransform(y, [-140, -60, 0], [1.1, 0.85, 0.6]);

  // Border glow based on swipe direction
  const borderGlowRight = useTransform(x, [0, 80, 160], ['rgba(34,197,94,0)', 'rgba(34,197,94,0.3)', 'rgba(34,197,94,0.6)']);
  const borderGlowLeft = useTransform(x, [-160, -80, 0], ['rgba(239,68,68,0.6)', 'rgba(239,68,68,0.3)', 'rgba(239,68,68,0)']);

  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 100;
    const verticalThreshold = -100;

    if (info.offset.y < verticalThreshold && Math.abs(info.offset.x) < swipeThreshold) {
      setExitDirection('up');
      onSwipe('up');
    } else if (info.offset.x > swipeThreshold) {
      setExitDirection('right');
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold) {
      setExitDirection('left');
      onSwipe('left');
    }
  };

  const getExitAnimation = () => {
    switch (exitDirection) {
      case 'left': return { x: -600, opacity: 0, rotate: -25 };
      case 'right': return { x: 600, opacity: 0, rotate: 25 };
      case 'up': return { y: -600, opacity: 0, scale: 0.8 };
      default: return {};
    }
  };

  if (!isTop) return null;

  return (
    <motion.div
      className="absolute inset-0 flex items-start justify-center cursor-grab active:cursor-grabbing px-3 pt-1 pb-3"
      style={{ x, y, rotate, opacity: cardOpacity }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? getExitAnimation() : {}}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <motion.div
        className="relative w-full max-w-[400px] h-full rounded-[28px] overflow-hidden bg-card"
        style={{
          boxShadow: '0 8px 40px -8px rgba(0,0,0,0.25), 0 2px 12px -2px rgba(0,0,0,0.15)',
        }}
      >
        {/* Profile Image */}
        <div className="absolute inset-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 via-accent/25 to-secondary flex items-center justify-center">
              <span className="text-[120px] font-bold text-primary/25 select-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 via-55% to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5" />
        </div>

        {/* Top badges row */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          {/* Verified badge */}
          {profile.is_verified && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30">
              <Verified className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-[11px] font-semibold text-primary">Vérifié</span>
            </div>
          )}
          {(profile as any)._isBoosted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-xl border border-amber-400/30">
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400">En avant</span>
            </div>
          )}
          
          {/* Online indicator */}
          {(() => {
            const isTrulyOnline = isUserTrulyOnline(profile);
            return (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border ml-auto ${
                isTrulyOnline 
                  ? 'bg-green-500/15 border-green-400/25' 
                  : 'bg-white/8 border-white/10'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isTrulyOnline ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)] animate-pulse' : 'bg-white/25'
                }`} />
                <span className={`text-[11px] font-medium ${
                  isTrulyOnline ? 'text-green-300' : 'text-white/40'
                }`}>
                  {isTrulyOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Swipe indicators */}
        <motion.div
          className="absolute top-16 left-5 z-30 flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/25 backdrop-blur-xl border-2 border-red-400/40 rotate-[-12deg]"
          style={{ opacity: nopeOpacity, scale: nopeScale }}
        >
          <X className="w-6 h-6 text-red-400" strokeWidth={3} />
          <span className="text-red-300 font-black text-xl tracking-[0.2em]">NOPE</span>
        </motion.div>

        <motion.div
          className="absolute top-16 right-5 z-30 flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500/25 backdrop-blur-xl border-2 border-green-400/40 rotate-[12deg]"
          style={{ opacity: likeOpacity, scale: likeScale }}
        >
          <Heart className="w-6 h-6 text-green-400 fill-green-400" />
          <span className="text-green-300 font-black text-xl tracking-[0.2em]">LIKE</span>
        </motion.div>

        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-500/25 backdrop-blur-xl border-2 border-purple-400/40"
          style={{ opacity: hideOpacity, scale: hideScale }}
        >
          <EyeOff className="w-6 h-6 text-purple-400" />
          <span className="text-purple-300 font-black text-xl tracking-[0.2em]">MASQUER</span>
        </motion.div>

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-6">
          {/* Name & age */}
          <div className="flex items-end gap-2 mb-1.5">
            <h2 className="text-[28px] font-bold text-white leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {profile.username}
            </h2>
            {profile.age && (
              <span className="text-[22px] text-white/70 font-light mb-0.5">{profile.age}</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 text-white/50" />
            <span className="text-[13px] text-white/60 font-medium">{profile.region}</span>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.height && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-md rounded-xl text-[11px] px-2.5 py-1 gap-1">
                <Ruler className="w-3 h-3 opacity-60" />
                {profile.height} cm
              </Badge>
            )}
            {profile.weight && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-md rounded-xl text-[11px] px-2.5 py-1 gap-1">
                <Scale className="w-3 h-3 opacity-60" />
                {profile.weight} kg
              </Badge>
            )}
            {profile.body_type && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-md rounded-xl text-[11px] px-2.5 py-1">
                {profile.body_type}
              </Badge>
            )}
            {profile.sexual_position && (
              <Badge variant="secondary" className="bg-primary/20 text-white/90 border-0 backdrop-blur-md rounded-xl text-[11px] px-2.5 py-1">
                {profile.sexual_position}
              </Badge>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-[13px] text-white/65 line-clamp-2 leading-relaxed mb-3">{profile.bio}</p>
          )}

          {/* Looking for tags */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.looking_for.slice(0, 3).map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="bg-primary/12 text-white/85 border-primary/25 text-[11px] backdrop-blur-md rounded-xl px-2.5 py-1"
                >
                  <Flame className="w-3 h-3 mr-1 text-primary" />
                  {item}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SwipeCard;
