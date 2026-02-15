import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, MessageCircle, Loader2, RefreshCw, X, EyeOff, Flame, Zap } from 'lucide-react';
import { useSwipeActions, SWIPE_CREDIT_COSTS } from '@/hooks/useSwipeActions';
import SwipeCard from './SwipeCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/useProfiles';

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'swipe' | 'likes'>('swipe');

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    const actionType = direction === 'right' ? 'like' : direction === 'left' ? 'dislike' : 'hide';
    
    swipe({ 
      targetUserId: currentProfile.user_id, 
      actionType 
    });

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 300);
  }, [profiles, currentIndex, swipe]);

  const remainingProfiles = profiles.slice(currentIndex);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'swipe' | 'likes')}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-5 pb-3">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/60 backdrop-blur-sm p-1 rounded-2xl h-12">
            <TabsTrigger
              value="swipe"
              className="gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <Flame className="w-4 h-4" />
              Découvrir
            </TabsTrigger>
            <TabsTrigger
              value="likes"
              className="gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <Heart className="w-4 h-4" />
              Mes likes
              {likedProfiles.length > 0 && (
                <span className="ml-0.5 text-[10px] bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {likedProfiles.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="swipe" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                  <Loader2 className="w-9 h-9 animate-spin text-primary" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-3xl border-2 border-primary/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <p className="text-sm text-muted-foreground font-medium">Chargement des profils…</p>
            </div>
          ) : remainingProfiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative mb-6"
              >
                <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-primary/15 via-accent/10 to-secondary flex items-center justify-center">
                  <Sparkles className="w-14 h-14 text-primary/60" />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2 w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="w-5 h-5 text-accent" />
                </motion.div>
              </motion.div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                C'est tout pour le moment !
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-[260px] leading-relaxed">
                Tu as vu tous les profils disponibles. Reviens plus tard pour de nouvelles découvertes.
              </p>
              <Button onClick={() => refetchProfiles()} variant="outline" className="gap-2 rounded-2xl h-11 px-6 font-medium">
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Cards stack */}
              <div className="flex-1 relative min-h-0">
                <AnimatePresence mode="popLayout">
                  {remainingProfiles.slice(0, 3).map((profile, index) => (
                    <SwipeCard
                      key={profile.id}
                      profile={profile}
                      onSwipe={handleSwipe}
                      isTop={index === 0}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="relative z-20 flex justify-center items-center gap-4 py-4 px-6">
                {/* Dislike */}
                <motion.div whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}>
                  <button
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center bg-card border-2 border-destructive/30 shadow-lg shadow-destructive/10 hover:border-destructive/50 hover:shadow-destructive/20 transition-all active:bg-destructive/10"
                    onClick={() => remainingProfiles[0] && handleSwipe('left')}
                  >
                    <X className="w-6 h-6 text-destructive" strokeWidth={2.5} />
                  </button>
                </motion.div>

                {/* Hide */}
                <motion.div whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}>
                  <button
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center bg-card border-2 border-purple-400/30 shadow-lg shadow-purple-400/10 hover:border-purple-400/50 hover:shadow-purple-400/20 transition-all active:bg-purple-400/10"
                    onClick={() => remainingProfiles[0] && handleSwipe('up')}
                  >
                    <EyeOff className="w-[18px] h-[18px] text-purple-400" />
                  </button>
                </motion.div>

                {/* Like */}
                <motion.div whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}>
                  <button
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all active:from-green-500 active:to-green-600"
                    onClick={() => remainingProfiles[0] && handleSwipe('right')}
                  >
                    <Heart className="w-6 h-6 text-white" fill="white" />
                  </button>
                </motion.div>
              </div>

              {/* Credit costs */}
              <div className="px-5 pb-3">
                <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Heart className="w-2.5 h-2.5 text-green-500" fill="currentColor" />
                    </span>
                    <span>{creditCosts.like} cr</span>
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-destructive" />
                    </span>
                    <span>{creditCosts.dislike} cr</span>
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <EyeOff className="w-2.5 h-2.5 text-purple-400" />
                    </span>
                    <span>{creditCosts.hide} cr</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="likes" className="flex-1 min-h-0 mt-0">
          <LikedProfilesList 
            likedUserIds={likedProfiles} 
            onStartChat={onStartChat}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Liked profiles list component
const LikedProfilesList = ({ 
  likedUserIds, 
  onStartChat 
}: { 
  likedUserIds: string[]; 
  onStartChat: (userId: string) => void;
}) => {
  if (likedUserIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-pink-500/12 to-primary/12 flex items-center justify-center">
            <Heart className="w-12 h-12 text-pink-400/60" />
          </div>
        </motion.div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Aucun like
        </h3>
        <p className="text-muted-foreground text-sm max-w-[240px] leading-relaxed">
          Les profils que tu aimes apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-2">
        {likedUserIds.map((userId, index) => (
          <motion.div
            key={userId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
          >
            <LikedProfileCard 
              userId={userId} 
              onStartChat={onStartChat}
            />
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
};

// Individual liked profile card
const LikedProfileCard = ({ 
  userId, 
  onStartChat 
}: { 
  userId: string; 
  onStartChat: (userId: string) => void;
}) => {
  const { data: profile, isLoading } = useProfile(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted rounded-lg mb-2" />
          <div className="h-3 w-16 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 group">
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-primary/10 ring-2 ring-primary/5">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/8 text-primary font-semibold">
            {profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {profile.is_online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-card shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate text-sm">{profile.username}</span>
          {profile.age && <span className="text-sm text-muted-foreground">{profile.age}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{profile.region}</p>
      </div>

      <Button
        size="sm"
        onClick={() => onStartChat(userId)}
        className="gap-1.5 rounded-xl shadow-sm h-9 px-4 font-medium"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Message
      </Button>
    </div>
  );
};

export default SwipePage;
