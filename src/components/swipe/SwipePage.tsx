import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, MessageCircle, Loader2, RefreshCw, Info } from 'lucide-react';
import { useSwipeActions, SWIPE_CREDIT_COSTS } from '@/hooks/useSwipeActions';
import SwipeCard from './SwipeCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'swipe' | 'likes')} className="flex-1 flex flex-col">
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

        <TabsContent value="swipe" className="flex-1 flex flex-col mt-0">
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
            <div className="flex-1 relative overflow-hidden min-h-[500px]">
              {/* Cards stack */}
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

              {/* Credits info */}
              <div className="absolute top-4 left-4 right-4 flex justify-center z-10">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Heart className="w-3.5 h-3.5 text-green-500" />
                    <span>{creditCosts.like} cr</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-red-500">✕</span>
                    <span>{creditCosts.dislike} cr</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-purple-500">↑</span>
                    <span>{creditCosts.hide} cr</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-muted/50 border-t border-border">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p><strong className="text-foreground">Glisse à droite</strong> pour aimer ({creditCosts.like} cr)</p>
                <p><strong className="text-foreground">Glisse à gauche</strong> pour passer ({creditCosts.dislike} cr) - revient dans 3 mois</p>
                <p><strong className="text-foreground">Glisse vers le haut</strong> pour masquer définitivement ({creditCosts.hide} cr)</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="likes" className="flex-1 mt-0">
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
