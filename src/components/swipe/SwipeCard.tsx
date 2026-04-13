import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { MapPin, ShieldCheck, Ruler, Scale, Heart, X, EyeOff, Flame, Rocket } from 'lucide-react';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

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
    _photos?: string[];
  };
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
  stackIndex: number;
  onViewProfile?: (userId: string) => void;
}

const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': '🔥 Plan cul', 'plan_regulier': '🔄 Régulier', 'relation': '❤️ Relation',
  'amitie': '🤝 Amitié', 'discussion': '💬 Discussion', 'webcam': '📹 Webcam', 'groupe': '👥 Groupe',
};

const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif', 'passif': '🔽 Passif', 'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Vers. Top', 'vers_bottom': '↕️🔽 Vers. Bottom',
  'side': '🤝 Side',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  'mince': 'Mince', 'moyen': 'Moyen', 'muscle': 'Musclé',
  'costaud': 'Costaud', 'gros': 'Gros', 'sportif': 'Sportif',
};

const SwipeCard = memo(({ profile, onSwipe, isTop, stackIndex, onViewProfile }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const cardOpacity = useTransform(x, [-300, -150, 0, 150, 300], [0.5, 1, 1, 1, 0.5]);

  // Swipe indicators
  const likeOpacity = useTransform(x, [0, 40, 100], [0, 0.3, 1]);
  const likeScale = useTransform(x, [0, 40, 100], [0.5, 0.7, 1.1]);
  const nopeOpacity = useTransform(x, [-100, -40, 0], [1, 0.3, 0]);
  const nopeScale = useTransform(x, [-100, -40, 0], [1.1, 0.7, 0.5]);
  const hideOpacity = useTransform(y, [-100, -40, 0], [1, 0.3, 0]);
  const hideScale = useTransform(y, [-100, -40, 0], [1.1, 0.7, 0.5]);

  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const isDraggingRef = useRef(false);

  // Photos array
  const photos = profile._photos?.length 
    ? profile._photos 
    : profile.avatar_url 
      ? [profile.avatar_url] 
      : [];

  // Preload next/prev photos
  useEffect(() => {
    if (!isTop) return;
    photos.forEach((url, i) => {
      if (i !== currentPhotoIndex) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [isTop, photos, currentPhotoIndex]);

  const handlePhotoTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isDraggingRef.current || photos.length <= 1) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const relativeX = (clientX - rect.left) / rect.width;
    
    if (relativeX < 0.3) {
      setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
    } else if (relativeX > 0.7) {
      setCurrentPhotoIndex(prev => Math.min(photos.length - 1, prev + 1));
    }
  }, [photos.length]);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setTimeout(() => { isDraggingRef.current = false; }, 50);
    
    const swipeThreshold = 90;
    const verticalThreshold = -90;

    if (info.offset.y < verticalThreshold && Math.abs(info.offset.x) < swipeThreshold) {
      setExitDirection('up');
      triggerHaptic();
      onSwipe('up');
    } else if (info.offset.x > swipeThreshold) {
      setExitDirection('right');
      triggerHaptic();
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold) {
      setExitDirection('left');
      triggerHaptic();
      onSwipe('left');
    }
  }, [onSwipe]);

  const getExitAnimation = () => {
    switch (exitDirection) {
      case 'left': return { x: -800, opacity: 0, rotate: -25 };
      case 'right': return { x: 800, opacity: 0, rotate: 25 };
      case 'up': return { y: -800, opacity: 0, scale: 0.6 };
      default: return {};
    }
  };

  // Stack positioning for cards behind
  const stackScale = 1 - stackIndex * 0.04;
  const stackY = stackIndex * 8;

  const isTrulyOnline = isUserTrulyOnline(profile);
  
  const infoPills: { icon?: React.ReactNode; label: string }[] = [];
  if (profile.height) infoPills.push({ icon: <Ruler className="w-3 h-3" />, label: `${profile.height} cm` });
  if (profile.weight) infoPills.push({ icon: <Scale className="w-3 h-3" />, label: `${profile.weight} kg` });
  if (profile.body_type && BODY_TYPE_LABELS[profile.body_type]) infoPills.push({ label: BODY_TYPE_LABELS[profile.body_type] });
  if (profile.sexual_position && POSITION_LABELS[profile.sexual_position]) infoPills.push({ label: POSITION_LABELS[profile.sexual_position] });

  return (
    <motion.div
      className={cn(
        "absolute inset-0 flex items-start justify-center px-3 pt-1 pb-3",
        isTop ? "z-10 cursor-grab active:cursor-grabbing" : "z-0"
      )}
      style={isTop ? { x, y, rotate, opacity: cardOpacity } : { scale: stackScale, y: stackY }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragStart={handleDragStart}
      onDragEnd={isTop ? handleDragEnd : undefined}
      animate={exitDirection ? getExitAnimation() : isTop ? {} : { scale: stackScale, y: stackY }}
      transition={exitDirection 
        ? { type: 'spring', stiffness: 300, damping: 28 } 
        : { type: 'spring', stiffness: 400, damping: 30 }
      }
    >
      <div 
        className="relative w-full max-w-[420px] h-full rounded-[28px] overflow-hidden shadow-[0_8px_40px_-8px_rgba(0,0,0,0.35)] border border-border/10"
        onClick={handlePhotoTap}
      >
        {/* Photos */}
        <div className="absolute inset-0">
          {photos.length > 0 ? (
            <>
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`${profile.username} photo ${i + 1}`}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover select-none transition-opacity duration-300",
                    i === currentPhotoIndex ? "opacity-100" : "opacity-0"
                  )}
                  draggable={false}
                />
              ))}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/15 to-secondary flex items-center justify-center">
              <span className="text-[120px] font-black text-primary/15 select-none" style={{ fontFamily: 'Syne, sans-serif' }}>
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Cinematic gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 via-50% to-black/5" />
        </div>

        {/* Photo progress bar */}
        {photos.length > 1 && (
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
            {photos.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20"
              >
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={false}
                  animate={{ width: i === currentPhotoIndex ? '100%' : i < currentPhotoIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-8 left-4 right-4 z-20 flex items-center gap-2">
          {profile.is_verified && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Vérifié</span>
            </div>
          )}
          {profile._isBoosted && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 backdrop-blur-xl border border-accent/30">
              <Rocket className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wide">Boost</span>
            </div>
          )}
          <div className="ml-auto">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl border",
              isTrulyOnline ? "bg-green-500/20 border-green-400/30" : "bg-white/5 border-white/10"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                isTrulyOnline ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)] animate-pulse" : "bg-white/20"
              )} />
              <span className={cn(
                "text-[10px] font-semibold tracking-wide",
                isTrulyOnline ? "text-green-300" : "text-white/30"
              )}>
                {isTrulyOnline ? 'EN LIGNE' : 'HORS LIGNE'}
              </span>
            </div>
          </div>
        </div>

        {/* Invisible tap zones for photo navigation */}
        {photos.length > 1 && isTop && (
          <>
            <div className="absolute inset-y-0 left-0 w-[30%] z-20" />
            <div className="absolute inset-y-0 right-0 w-[30%] z-20" />
          </>
        )}

        {/* Swipe indicators */}
        <motion.div
          className="absolute top-24 left-6 z-30 px-5 py-2.5 rounded-2xl bg-destructive/25 backdrop-blur-xl border-2 border-destructive/40 -rotate-12"
          style={{ opacity: nopeOpacity, scale: nopeScale }}
        >
          <div className="flex items-center gap-2">
            <X className="w-6 h-6 text-destructive" strokeWidth={3} />
            <span className="text-destructive font-black text-xl tracking-[0.2em]" style={{ fontFamily: 'Syne, sans-serif' }}>NOPE</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-24 right-6 z-30 px-5 py-2.5 rounded-2xl bg-primary/25 backdrop-blur-xl border-2 border-primary/40 rotate-12"
          style={{ opacity: likeOpacity, scale: likeScale }}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" fill="currentColor" />
            <span className="text-primary font-black text-xl tracking-[0.2em]" style={{ fontFamily: 'Syne, sans-serif' }}>LIKE</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl bg-muted/25 backdrop-blur-xl border-2 border-muted-foreground/30"
          style={{ opacity: hideOpacity, scale: hideScale }}
        >
          <div className="flex items-center gap-2">
            <EyeOff className="w-6 h-6 text-muted-foreground" />
            <span className="text-muted-foreground font-black text-xl tracking-[0.2em]" style={{ fontFamily: 'Syne, sans-serif' }}>MASQUER</span>
          </div>
        </motion.div>

        {/* Bottom profile info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-6">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <h2 className="text-2xl font-black text-white leading-none tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
              {profile.username}
            </h2>
            {profile.age && (
              <span className="text-xl text-white/60 font-light">{profile.age}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            <span className="text-sm text-white/50 font-medium">{profile.region}</span>
          </div>

          {infoPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {infoPills.map((pill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-xl text-white/85 text-xs font-medium border border-white/10"
                >
                  {pill.icon && <span className="opacity-60">{pill.icon}</span>}
                  {pill.label}
                </span>
              ))}
            </div>
          )}

          {profile.bio && (
            <p className="text-sm text-white/55 line-clamp-2 leading-relaxed mb-3">{profile.bio}</p>
          )}

          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.looking_for.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/20 text-white/80 text-[11px] font-semibold border border-primary/25 backdrop-blur-xl"
                >
                  <Flame className="w-2.5 h-2.5 text-primary" />
                  {LOOKING_FOR_LABELS[item] || item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

/** Trigger haptic feedback on supported devices */
function triggerHaptic() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  } catch {}
}

export default SwipeCard;
