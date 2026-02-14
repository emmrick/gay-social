import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { MapPin, Verified, Ruler, Scale, Heart, X, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SwipeCardProps {
  profile: {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    is_online: boolean | null;
    region: string;
    is_verified: boolean;
    looking_for: string[] | null;
    sexual_position: string | null;
    height: number | null;
    weight: number | null;
    body_type: string | null;
  };
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
}

const SwipeCard = ({ profile, onSwipe, isTop }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const cardOpacity = useTransform(x, [-200, -100, 0, 100, 200], [0.6, 1, 1, 1, 0.6]);
  
  const likeOpacity = useTransform(x, [0, 80, 160], [0, 0.6, 1]);
  const likeScale = useTransform(x, [0, 80, 160], [0.5, 0.8, 1]);
  const nopeOpacity = useTransform(x, [-160, -80, 0], [1, 0.6, 0]);
  const nopeScale = useTransform(x, [-160, -80, 0], [1, 0.8, 0.5]);
  const hideOpacity = useTransform(y, [-160, -80, 0], [1, 0.6, 0]);
  const hideScale = useTransform(y, [-160, -80, 0], [1, 0.8, 0.5]);

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
      case 'left': return { x: -500, opacity: 0, rotate: -30 };
      case 'right': return { x: 500, opacity: 0, rotate: 30 };
      case 'up': return { y: -500, opacity: 0 };
      default: return {};
    }
  };

  if (!isTop) return null;

  return (
    <motion.div
      className="absolute inset-0 flex items-start justify-center cursor-grab active:cursor-grabbing px-4 pt-2 pb-4"
      style={{ x, y, rotate, opacity: cardOpacity }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? getExitAnimation() : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="relative w-full max-w-[400px] h-full rounded-3xl overflow-hidden bg-card shadow-[var(--shadow-card)]">
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
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary flex items-center justify-center">
              <span className="text-8xl font-bold text-primary/40 font-heading">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 via-50% to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        </div>

        {/* Online indicator - glassmorphism */}
        <div className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border ${
          profile.is_online 
            ? 'bg-green-500/15 border-green-400/30' 
            : 'bg-black/20 border-white/10'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            profile.is_online ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-white/30'
          }`} />
          <span className={`text-xs font-medium ${
            profile.is_online ? 'text-green-300' : 'text-white/50'
          }`}>
            {profile.is_online ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>

        {/* Swipe indicators - modern glassmorphism */}
        <motion.div
          className="absolute top-12 left-6 z-30 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-400/30 rotate-[-12deg]"
          style={{ opacity: nopeOpacity, scale: nopeScale }}
        >
          <X className="w-5 h-5 text-red-400" />
          <span className="text-red-300 font-bold text-lg tracking-wider">NOPE</span>
        </motion.div>
        <motion.div
          className="absolute top-12 right-6 z-30 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-green-500/20 backdrop-blur-md border border-green-400/30 rotate-[12deg]"
          style={{ opacity: likeOpacity, scale: likeScale }}
        >
          <Heart className="w-5 h-5 text-green-400 fill-green-400" />
          <span className="text-green-300 font-bold text-lg tracking-wider">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-500/20 backdrop-blur-md border border-purple-400/30"
          style={{ opacity: hideOpacity, scale: hideScale }}
        >
          <EyeOff className="w-5 h-5 text-purple-400" />
          <span className="text-purple-300 font-bold text-lg tracking-wider">MASQUER</span>
        </motion.div>

        {/* Profile Info - glassmorphism bottom card */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-6">
          {/* Name row */}
          <div className="flex items-center gap-2.5 mb-2">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {profile.username}
            </h2>
            {profile.age && (
              <span className="text-xl text-white/80 font-light">{profile.age}</span>
            )}
            {profile.is_verified && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/30 backdrop-blur-sm">
                <Verified className="w-4 h-4 text-primary fill-primary" />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 text-white/60" />
            <span className="text-sm text-white/70 font-medium">{profile.region}</span>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.height && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-sm rounded-lg text-xs px-2.5 py-1">
                <Ruler className="w-3 h-3 mr-1 opacity-70" />
                {profile.height} cm
              </Badge>
            )}
            {profile.weight && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-sm rounded-lg text-xs px-2.5 py-1">
                <Scale className="w-3 h-3 mr-1 opacity-70" />
                {profile.weight} kg
              </Badge>
            )}
            {profile.body_type && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-sm rounded-lg text-xs px-2.5 py-1">
                {profile.body_type}
              </Badge>
            )}
            {profile.sexual_position && (
              <Badge variant="secondary" className="bg-white/10 text-white/90 border-0 backdrop-blur-sm rounded-lg text-xs px-2.5 py-1">
                {profile.sexual_position}
              </Badge>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-white/75 line-clamp-2 leading-relaxed mb-3">{profile.bio}</p>
          )}

          {/* Looking for tags */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.looking_for.slice(0, 3).map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="bg-primary/15 text-white/90 border-primary/30 text-xs backdrop-blur-sm rounded-lg"
                >
                  {item}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
