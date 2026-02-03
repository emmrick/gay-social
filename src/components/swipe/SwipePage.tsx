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

    // Move to next card
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
        <div className="px-4 pb-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="swipe" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Découvrir
            </TabsTrigger>
            <TabsTrigger value="likes" className="gap-2">
              <Heart className="w-4 h-4" />
              Mes likes ({likedProfiles.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="swipe" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : remainingProfiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Plus de profils</h3>
              <p className="text-muted-foreground mb-6">
                Tu as vu tous les profils disponibles pour le moment. Reviens plus tard !
              </p>
              <Button onClick={() => refetchProfiles()} variant="outline" className="gap-2">
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

              {/* Action buttons */}
              <div className="relative z-20 flex justify-center items-center gap-4 py-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full border-2 border-red-500 bg-background hover:bg-red-500/20 shadow-lg"
                  onClick={() => remainingProfiles[0] && handleSwipe('left')}
                >
                  <X className="w-7 h-7 text-red-500" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="w-11 h-11 rounded-full border-2 border-purple-500 bg-background hover:bg-purple-500/20 shadow-lg"
                  onClick={() => remainingProfiles[0] && handleSwipe('up')}
                >
                  <EyeOff className="w-5 h-5 text-purple-500" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full border-2 border-green-500 bg-background hover:bg-green-500/20 shadow-lg"
                  onClick={() => remainingProfiles[0] && handleSwipe('right')}
                >
                  <Heart className="w-7 h-7 text-green-500" />
                </Button>
              </div>

              {/* Instructions */}
              <div className="px-4 py-2 bg-muted/30 border-t border-border">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Info className="w-3 h-3 shrink-0" />
                  <span><strong>→</strong> aimer ({creditCosts.like} cr) • <strong>←</strong> passer ({creditCosts.dislike} cr) • <strong>↑</strong> masquer ({creditCosts.hide} cr)</span>
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
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Aucun like</h3>
        <p className="text-muted-foreground">
          Les profils que tu aimes apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-2">
        {likedUserIds.map((userId) => (
          <LikedProfileCard 
            key={userId} 
            userId={userId} 
            onStartChat={onStartChat}
          />
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
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border animate-pulse">
        <div className="w-12 h-12 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
    >
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-primary/20">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {profile.is_online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
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
        className="gap-1.5"
      >
        <MessageCircle className="w-4 h-4" />
        Message
      </Button>
    </motion.div>
  );
};

export default SwipePage;
