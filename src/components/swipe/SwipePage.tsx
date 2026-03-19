import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, MessageCircle, Loader2, RefreshCw, X, EyeOff, Flame, Zap, Rocket, Crown, Users, ShieldCheck } from 'lucide-react';
import { useSwipeActions } from '@/hooks/useSwipeActions';
import SwipeCard from './SwipeCard';
import MatchPopup from './MatchPopup';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfiles';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { useProfileBoost } from '@/hooks/useProfileBoost';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SwipePageProps {
  onStartChat: (userId: string) => void;
}

const SwipePage = ({ onStartChat }: SwipePageProps) => {
  const { 
    profiles, 
    likedProfiles, 
    isLoading, 
    swipe, 
    isSwaping,
    refetchProfiles,
    creditCosts,
  } = useSwipeActions();

  const { profile: myProfile } = useAuth();
  const { isBoostActive, activateBoost, isActivating, boostCost, boostExpiresAt } = useProfileBoost();
  const { totalCredits } = useCreditCheck();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'swipe' | 'likes'>('swipe');
  const [matchPopup, setMatchPopup] = useState<{ isOpen: boolean; username: string; avatar: string | null; userId: string }>({
    isOpen: false, username: '', avatar: null, userId: '',
  });

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    const actionType = direction === 'right' ? 'like' : direction === 'left' ? 'dislike' : 'hide';
    
    swipe({ 
      targetUserId: currentProfile.user_id, 
      actionType,
      onMatch: (matchedProfile) => {
        setMatchPopup({
          isOpen: true,
          username: matchedProfile.username,
          avatar: matchedProfile.avatar_url,
          userId: matchedProfile.user_id,
        });
      },
    });

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 300);
  }, [profiles, currentIndex, swipe]);

  // Preload images of next profiles
  const remainingProfiles = profiles.slice(currentIndex);
  useEffect(() => {
    remainingProfiles.slice(1, 4).forEach(p => {
      if (p.avatar_url) {
        const img = new Image();
        img.src = p.avatar_url;
      }
      (p as any)._photos?.forEach((url: string) => {
        const img = new Image();
        img.src = url;
      });
    });
  }, [currentIndex, remainingProfiles]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab switcher */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 p-1 bg-secondary/50 backdrop-blur-sm rounded-2xl">
          <button
            onClick={() => setActiveTab('swipe')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === 'swipe'
                ? 'bg-card text-foreground shadow-lg shadow-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flame className="w-4 h-4" />
            Découvrir
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative ${
              activeTab === 'likes'
                ? 'bg-card text-foreground shadow-lg shadow-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className="w-4 h-4" />
            Mes likes
            {likedProfiles.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                {likedProfiles.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'swipe' ? (
          <motion.div
            key="swipe"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {isLoading ? (
              <LoadingState />
            ) : remainingProfiles.length === 0 ? (
              <EmptySwipeState onRefresh={refetchProfiles} />
            ) : (
              <>
                {/* Cards stack - show up to 3 stacked */}
                <div className="flex-1 relative min-h-0">
                  <AnimatePresence mode="popLayout">
                    {remainingProfiles.slice(0, 3).map((profile, index) => (
                      <SwipeCard
                        key={profile.id}
                        profile={profile}
                        onSwipe={handleSwipe}
                        isTop={index === 0}
                        stackIndex={index}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Action buttons */}
                <div className="relative z-20 flex justify-center items-center gap-5 py-4 px-6">
                  <ActionButton
                    onClick={() => remainingProfiles[0] && handleSwipe('left')}
                    color="destructive"
                    size="lg"
                    icon={<X className="w-7 h-7" strokeWidth={2.5} />}
                  />
                  <ActionButton
                    onClick={() => remainingProfiles[0] && handleSwipe('up')}
                    color="purple"
                    size="sm"
                    icon={<EyeOff className="w-5 h-5" />}
                  />
                  <ActionButton
                    onClick={() => remainingProfiles[0] && handleSwipe('right')}
                    color="green"
                    size="lg"
                    icon={<Heart className="w-7 h-7" fill="white" />}
                  />
                </div>

                {/* Credit costs bar */}
                <CreditCostsBar creditCosts={creditCosts} />
              </>
            )}

            {/* Boost banner */}
            <BoostBanner
              isBoostActive={isBoostActive}
              activateBoost={activateBoost}
              isActivating={isActivating}
              boostCost={boostCost}
              boostExpiresAt={boostExpiresAt}
              totalCredits={totalCredits}
            />
          </motion.div>
        ) : (
          <motion.div
            key="likes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0"
          >
            <LikedProfilesList likedUserIds={likedProfiles} onStartChat={onStartChat} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Popup */}
      <MatchPopup
        isOpen={matchPopup.isOpen}
        onClose={() => setMatchPopup(prev => ({ ...prev, isOpen: false }))}
        onSendMessage={() => {
          setMatchPopup(prev => ({ ...prev, isOpen: false }));
          onStartChat(matchPopup.userId);
        }}
        myAvatar={myProfile?.avatar_url}
        matchAvatar={matchPopup.avatar}
        matchUsername={matchPopup.username}
      />
    </div>
  );
};

/* ───── Action Button ───── */
const ActionButton = ({
  onClick,
  color,
  size,
  icon,
}: {
  onClick: () => void;
  color: 'destructive' | 'purple' | 'green';
  size: 'sm' | 'lg';
  icon: React.ReactNode;
}) => {
  const styles = {
    destructive: 'border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 shadow-destructive/10 hover:shadow-destructive/20',
    purple: 'border-purple-400/30 text-purple-400 hover:border-purple-400/50 hover:bg-purple-400/10 shadow-purple-400/10 hover:shadow-purple-400/20',
    green: 'bg-gradient-to-br from-green-400 to-green-500 text-white border-transparent shadow-green-500/30 hover:shadow-green-500/50 active:from-green-500 active:to-green-600',
  };

  const sizeClass = size === 'lg' ? 'w-[60px] h-[60px]' : 'w-[48px] h-[48px]';

  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.1 }}
      onClick={onClick}
      className={`${sizeClass} rounded-full flex items-center justify-center bg-card border-2 shadow-lg transition-all duration-200 ${styles[color]}`}
    >
      {icon}
    </motion.button>
  );
};

/* ───── Credit Costs ───── */
const CreditCostsBar = ({ creditCosts }: { creditCosts: { like: number; dislike: number; hide: number } }) => (
  <div className="px-5 pb-3">
    <div className="flex items-center justify-center gap-6 text-[11px] text-muted-foreground/50">
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-lg bg-green-500/10 flex items-center justify-center">
          <Heart className="w-2.5 h-2.5 text-green-500" fill="currentColor" />
        </span>
        {creditCosts.like} cr
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-lg bg-destructive/10 flex items-center justify-center">
          <X className="w-2.5 h-2.5 text-destructive" />
        </span>
        {creditCosts.dislike} cr
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <EyeOff className="w-2.5 h-2.5 text-purple-400" />
        </span>
        {creditCosts.hide} cr
      </span>
    </div>
  </div>
);

/* ───── Loading ───── */
const LoadingState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-5">
    <motion.div
      className="relative"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
      <motion.div
        className="absolute inset-0 rounded-[28px] border-2 border-primary/15"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </motion.div>
    <p className="text-sm text-muted-foreground font-medium">Chargement des profils…</p>
  </div>
);

/* ───── Empty swipe state ───── */
const EmptySwipeState = ({ onRefresh }: { onRefresh: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <motion.div
      initial={{ scale: 0.7, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      className="relative mb-8"
    >
      <div className="w-32 h-32 rounded-[36px] bg-gradient-to-br from-primary/10 via-accent/8 to-secondary flex items-center justify-center">
        <Sparkles className="w-16 h-16 text-primary/40" />
      </div>
      <motion.div
        className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center"
        animate={{ y: [0, -6, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Zap className="w-6 h-6 text-accent" />
      </motion.div>
    </motion.div>
    <h3 className="text-2xl font-black mb-3 text-foreground">
      C'est tout pour le moment !
    </h3>
    <p className="text-muted-foreground text-sm mb-8 max-w-[280px] leading-relaxed">
      Tu as vu tous les profils disponibles. Reviens plus tard pour de nouvelles découvertes.
    </p>
    <Button 
      onClick={onRefresh} 
      variant="outline" 
      className="gap-2 rounded-2xl h-12 px-8 font-semibold text-sm"
    >
      <RefreshCw className="w-4 h-4" />
      Rafraîchir
    </Button>
  </div>
);

/* ───── Boost Banner ───── */
const BoostBanner = ({
  isBoostActive,
  activateBoost,
  isActivating,
  boostCost,
  boostExpiresAt,
  totalCredits,
}: {
  isBoostActive: boolean;
  activateBoost: () => void;
  isActivating: boolean;
  boostCost: number;
  boostExpiresAt: Date | null;
  totalCredits: number;
}) => (
  <div className="px-5 pb-4">
    {isBoostActive ? (
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/15">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">Profil en avant !</p>
          <p className="text-[10px] text-muted-foreground">
            Expire {boostExpiresAt ? `à ${boostExpiresAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'bientôt'}
          </p>
        </div>
        <span className="text-xs font-black text-amber-500 tracking-wide">ACTIF</span>
      </div>
    ) : (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => activateBoost()}
        disabled={isActivating || totalCredits < boostCost}
        className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/8 to-orange-500/8 border border-amber-500/10 hover:border-amber-500/25 transition-all disabled:opacity-40"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/15">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-foreground">Mettre en avant mon profil</p>
          <p className="text-[10px] text-muted-foreground">Visible 1 à 3 fois pendant 24h</p>
        </div>
        <span className="text-xs font-black text-amber-500">{boostCost} cr</span>
      </motion.button>
    )}
  </div>
);

/* ───── Liked Profiles List ───── */
const LikedProfilesList = ({ 
  likedUserIds, 
  onStartChat,
}: { 
  likedUserIds: string[]; 
  onStartChat: (userId: string) => void;
}) => {
  if (likedUserIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-8"
        >
          <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-pink-500/10 to-rose-400/10 flex items-center justify-center">
            <Heart className="w-14 h-14 text-pink-400/40" />
          </div>
          <motion.div
            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-rose-400" />
          </motion.div>
        </motion.div>
        <h3 className="text-2xl font-black mb-3 text-foreground">
          Aucun like
        </h3>
        <p className="text-muted-foreground text-sm max-w-[260px] leading-relaxed">
          Les profils que tu aimes apparaîtront ici. Commence à swiper !
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="px-5 pb-6 pt-2">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">
            {likedUserIds.length} profil{likedUserIds.length > 1 ? 's' : ''} aimé{likedUserIds.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-2.5">
          {likedUserIds.map((userId, index) => (
            <motion.div
              key={userId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
            >
              <LikedProfileCard userId={userId} onStartChat={onStartChat} />
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

/* ───── Individual Liked Profile Card ───── */
const LikedProfileCard = ({ 
  userId, 
  onStartChat,
}: { 
  userId: string; 
  onStartChat: (userId: string) => void;
}) => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/40 animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 bg-muted rounded-xl" />
          <div className="h-3 w-20 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      <button
        onClick={() => navigate(`/profile/${userId}`)}
        className="relative shrink-0"
      >
        <Avatar className="w-14 h-14 rounded-2xl border-2 border-primary/10">
          <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-primary/8 text-primary font-black text-lg">
            {profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isUserTrulyOnline(profile) && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-[3px] border-card shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-foreground truncate">{profile.username}</span>
          {profile.age && (
            <span className="text-sm text-muted-foreground font-medium">{profile.age}</span>
          )}
          {profile.is_verified && (
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{profile.region}</p>
      </div>

      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          size="sm"
          onClick={() => onStartChat(userId)}
          className="gap-1.5 rounded-xl shadow-sm h-10 px-5 font-bold text-xs"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Message
        </Button>
      </motion.div>
    </div>
  );
};

export default SwipePage;
