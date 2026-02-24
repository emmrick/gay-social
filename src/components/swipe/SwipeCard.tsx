import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { MapPin, ShieldCheck, Ruler, Scale, Heart, X, EyeOff, Flame, Rocket, Sparkles } from 'lucide-react';
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
  const rotate = useTransform(x, [-250, 250], [-18, 18]);
  const cardOpacity = useTransform(x, [-250, -120, 0, 120, 250], [0.6, 1, 1, 1, 0.6]);

  // Swipe indicators
  const likeOpacity = useTransform(x, [0, 50, 120], [0, 0.4, 1]);
  const likeScale = useTransform(x, [0, 50, 120], [0.5, 0.8, 1.15]);
  const nopeOpacity = useTransform(x, [-120, -50, 0], [1, 0.4, 0]);
  const nopeScale = useTransform(x, [-120, -50, 0], [1.15, 0.8, 0.5]);
  const hideOpacity = useTransform(y, [-120, -50, 0], [1, 0.4, 0]);
  const hideScale = useTransform(y, [-120, -50, 0], [1.15, 0.8, 0.5]);

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
      case 'left': return { x: -700, opacity: 0, rotate: -30 };
      case 'right': return { x: 700, opacity: 0, rotate: 30 };
      case 'up': return { y: -700, opacity: 0, scale: 0.7 };
      default: return {};
    }
  };

  if (!isTop) return null;

  const isTrulyOnline = isUserTrulyOnline(profile);
  const infoPills: { icon?: React.ReactNode; label: string }[] = [];
  if (profile.height) infoPills.push({ icon: <Ruler className="w-3 h-3" />, label: `${profile.height} cm` });
  if (profile.weight) infoPills.push({ icon: <Scale className="w-3 h-3" />, label: `${profile.weight} kg` });
  if (profile.body_type) infoPills.push({ label: profile.body_type });
  if (profile.sexual_position) infoPills.push({ label: profile.sexual_position });

  return (
    <motion.div
      className="absolute inset-0 flex items-start justify-center cursor-grab active:cursor-grabbing px-4 pt-1 pb-4"
      style={{ x, y, rotate, opacity: cardOpacity }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? getExitAnimation() : {}}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <div className="relative w-full max-w-[420px] h-full rounded-[32px] overflow-hidden shadow-[0_12px_60px_-12px_rgba(0,0,0,0.4)]">
        {/* Image */}
        <div className="absolute inset-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary flex items-center justify-center">
              <span className="text-[140px] font-black text-primary/15 select-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Cinematic overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 via-50% to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        </div>

        {/* Top bar - status badges */}
        <div className="absolute top-5 left-5 right-5 z-20 flex items-center gap-2">
          {profile.is_verified && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/25 backdrop-blur-2xl border border-primary/30 shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary tracking-wide uppercase">Vérifié</span>
            </div>
          )}
          {(profile as any)._isBoosted && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/25 backdrop-blur-2xl border border-amber-400/30 shadow-lg">
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-300 tracking-wide uppercase">Boost</span>
            </div>
          )}
          <div className="ml-auto">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-2xl border shadow-lg ${
              isTrulyOnline 
                ? 'bg-green-500/20 border-green-400/30' 
                : 'bg-white/5 border-white/10'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isTrulyOnline ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)] animate-pulse' : 'bg-white/20'
              }`} />
              <span className={`text-[10px] font-semibold tracking-wide ${
                isTrulyOnline ? 'text-green-300' : 'text-white/30'
              }`}>
                {isTrulyOnline ? 'EN LIGNE' : 'HORS LIGNE'}
              </span>
            </div>
          </div>
        </div>

        {/* Swipe indicators */}
        <motion.div
          className="absolute top-20 left-6 z-30 px-6 py-3 rounded-2xl bg-destructive/30 backdrop-blur-2xl border-2 border-destructive/50 -rotate-12 shadow-2xl"
          style={{ opacity: nopeOpacity, scale: nopeScale }}
        >
          <div className="flex items-center gap-2">
            <X className="w-7 h-7 text-destructive" strokeWidth={3} />
            <span className="text-destructive font-black text-2xl tracking-[0.25em]">NOPE</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-20 right-6 z-30 px-6 py-3 rounded-2xl bg-green-500/30 backdrop-blur-2xl border-2 border-green-400/50 rotate-12 shadow-2xl"
          style={{ opacity: likeOpacity, scale: likeScale }}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-green-400" fill="currentColor" />
            <span className="text-green-300 font-black text-2xl tracking-[0.25em]">LIKE</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-2xl bg-purple-500/30 backdrop-blur-2xl border-2 border-purple-400/50 shadow-2xl"
          style={{ opacity: hideOpacity, scale: hideScale }}
        >
          <div className="flex items-center gap-2">
            <EyeOff className="w-7 h-7 text-purple-400" />
            <span className="text-purple-300 font-black text-2xl tracking-[0.25em]">MASQUER</span>
          </div>
        </motion.div>

        {/* Bottom profile info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-7">
          {/* Name & Age */}
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-3xl font-black text-white leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {profile.username}
            </h2>
            {profile.age && (
              <span className="text-2xl text-white/60 font-light">{profile.age}</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            <span className="text-sm text-white/50 font-medium">{profile.region}</span>
          </div>

          {/* Info pills */}
          {infoPills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {infoPills.map((pill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl text-white/85 text-xs font-medium border border-white/5"
                >
                  {pill.icon && <span className="opacity-60">{pill.icon}</span>}
                  {pill.label}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-white/55 line-clamp-2 leading-relaxed mb-4">{profile.bio}</p>
          )}

          {/* Looking for */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.looking_for.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 text-white/80 text-[11px] font-semibold border border-primary/20 backdrop-blur-xl"
                >
                  <Flame className="w-3 h-3 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
