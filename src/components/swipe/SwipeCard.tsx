import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { MapPin, Verified, Ruler, Scale } from 'lucide-react';
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
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Indicator opacities
  const likeOpacity = useTransform(x, [0, 100, 200], [0, 0.5, 1]);
  const nopeOpacity = useTransform(x, [-200, -100, 0], [1, 0.5, 0]);
  const hideOpacity = useTransform(y, [-200, -100, 0], [1, 0.5, 0]);

  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 100;
    const verticalThreshold = -100;

    if (info.offset.y < verticalThreshold && Math.abs(info.offset.x) < swipeThreshold) {
      // Swipe up - hide permanently
      setExitDirection('up');
      onSwipe('up');
    } else if (info.offset.x > swipeThreshold) {
      // Swipe right - like
      setExitDirection('right');
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe left - dislike
      setExitDirection('left');
      onSwipe('left');
    }
  };


  const getExitAnimation = () => {
    switch (exitDirection) {
      case 'left':
        return { x: -500, opacity: 0, rotate: -30 };
      case 'right':
        return { x: 500, opacity: 0, rotate: 30 };
      case 'up':
        return { y: -500, opacity: 0 };
      default:
        return {};
    }
  };

  // Only render the top card - hide background cards completely
  if (!isTop) {
    return null;
  }

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, opacity }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? getExitAnimation() : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="relative w-full max-w-sm mx-4 aspect-[3/4] rounded-3xl overflow-hidden bg-card border border-border shadow-2xl">
        {/* Profile Image */}
        <div className="absolute inset-0 z-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <span className="text-6xl font-bold text-primary/50">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Online indicator */}
        <div className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border ${
          profile.is_online 
            ? 'bg-green-500/20 border-green-500/30' 
            : 'bg-muted/50 border-border/50'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            profile.is_online ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'
          }`} />
          <span className={`text-xs font-medium ${
            profile.is_online ? 'text-green-400' : 'text-muted-foreground'
          }`}>
            {profile.is_online ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>

        {/* Swipe indicators */}
        <motion.div
          className="absolute top-8 left-8 z-30 px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xl rotate-[-15deg] border-4 border-white"
          style={{ opacity: nopeOpacity }}
        >
          NOPE
        </motion.div>
        <motion.div
          className="absolute top-8 right-8 z-30 px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-xl rotate-[15deg] border-4 border-white"
          style={{ opacity: likeOpacity }}
        >
          LIKE
        </motion.div>
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-xl border-4 border-white"
          style={{ opacity: hideOpacity }}
        >
          MASQUER
        </motion.div>

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold drop-shadow-lg">{profile.username}</h2>
            {profile.age && <span className="text-xl opacity-90 drop-shadow-md">{profile.age}</span>}
            {profile.is_verified && (
              <Verified className="w-5 h-5 text-primary fill-primary drop-shadow-md" />
            )}
          </div>

          <div className="flex items-center gap-2 mb-3 text-sm opacity-90">
            <MapPin className="w-4 h-4" />
            <span className="drop-shadow-md">{profile.region}</span>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.height && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                <Ruler className="w-3 h-3 mr-1" />
                {profile.height} cm
              </Badge>
            )}
            {profile.weight && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                <Scale className="w-3 h-3 mr-1" />
                {profile.weight} kg
              </Badge>
            )}
            {profile.body_type && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {profile.body_type}
              </Badge>
            )}
            {profile.sexual_position && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {profile.sexual_position}
              </Badge>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm opacity-90 line-clamp-2 drop-shadow-md">{profile.bio}</p>
          )}

          {/* Looking for */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.looking_for.slice(0, 3).map((item) => (
                <Badge key={item} variant="outline" className="bg-primary/20 text-white border-primary/50 text-xs backdrop-blur-sm">
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
