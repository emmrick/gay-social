import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, MessageCircle, Loader2, RefreshCw, Info, X, EyeOff } from 'lucide-react';
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
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="swipe" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
              <Sparkles className="w-4 h-4" />
              Découvrir
            </TabsTrigger>
            <TabsTrigger value="likes" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
              <Heart className="w-4 h-4" />
              Mes likes
              {likedProfiles.length > 0 && (
                <span className="ml-1 text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {likedProfiles.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="swipe" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
              </div>
              <p className="text-sm text-muted-foreground">Chargement des profils…</p>
            </div>
          ) : remainingProfiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 shadow-lg"
              >
                <Sparkles className="w-12 h-12 text-primary" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Plus de profils
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-[260px]">
                Tu as vu tous les profils disponibles. Reviens plus tard pour de nouvelles découvertes !
              </p>
              <Button onClick={() => refetchProfiles()} variant="outline" className="gap-2 rounded-xl">
                <RefreshCw className="w-4 h-4" />
                Actualiser
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

              {/* Action buttons - modern floating style */}
              <div className="relative z-20 flex justify-center items-center gap-5 py-4">
                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-14 h-14 rounded-full border-2 border-destructive/40 bg-card hover:bg-destructive/10 shadow-lg hover:shadow-destructive/20 transition-all"
                    onClick={() => remainingProfiles[0] && handleSwipe('left')}
                  >
                    <X className="w-6 h-6 text-destructive" />
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-11 h-11 rounded-full border-2 border-purple-400/40 bg-card hover:bg-purple-500/10 shadow-lg hover:shadow-purple-500/20 transition-all"
                    onClick={() => remainingProfiles[0] && handleSwipe('up')}
                  >
                    <EyeOff className="w-4.5 h-4.5 text-purple-400" />
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-14 h-14 rounded-full border-2 border-green-400/40 bg-card hover:bg-green-500/10 shadow-lg hover:shadow-green-500/20 transition-all"
                    onClick={() => remainingProfiles[0] && handleSwipe('right')}
                  >
                    <Heart className="w-6 h-6 text-green-500" />
                  </Button>
                </motion.div>
              </div>

              {/* Instructions - subtle & elegant */}
              <div className="px-5 pb-3">
                <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-md bg-green-500/10 flex items-center justify-center text-green-500 text-[10px] font-bold">→</span>
                    <span>{creditCosts.like} cr</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-md bg-destructive/10 flex items-center justify-center text-destructive text-[10px] font-bold">←</span>
                    <span>{creditCosts.dislike} cr</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400 text-[10px] font-bold">↑</span>
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
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500/15 to-primary/15 flex items-center justify-center mb-5 shadow-lg"
        >
          <Heart className="w-12 h-12 text-pink-400" />
        </motion.div>
        <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Aucun like
        </h3>
        <p className="text-muted-foreground text-sm max-w-[240px]">
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
            transition={{ delay: index * 0.05 }}
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
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-200">
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-primary/15 ring-2 ring-primary/5">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {profile.is_online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-card shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{profile.username}</span>
          {profile.age && <span className="text-sm text-muted-foreground">{profile.age}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{profile.region}</p>
      </div>

      <Button
        size="sm"
        onClick={() => onStartChat(userId)}
        className="gap-1.5 rounded-xl shadow-sm"
      >
        <MessageCircle className="w-4 h-4" />
        Message
      </Button>
    </div>
  );
};

export default SwipePage;
