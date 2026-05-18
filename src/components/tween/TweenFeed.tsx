import { useEffect, useRef, useCallback, useState } from 'react';
import { useTweenFeed } from '@/hooks/useTweens';
import TweenCard from './TweenCard';
import TweenComposer from './TweenComposer';
import MyTweensTab from './MyTweensTab';
import TweenFavoritesTab from './TweenFavoritesTab';
import AdBanner from '@/components/ads/AdBanner';
import { Loader2, Sparkles, Globe2, User, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const TweenFeed = () => {
  const [tab, setTab] = useState<'public' | 'mine' | 'favorites'>('public');
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useTweenFeed();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const tweens = data?.pages.flat() || [];

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'public' | 'mine' | 'favorites')} className="max-w-xl mx-auto">
      <TabsList className="grid grid-cols-3 w-full h-11 mb-4 bg-muted/60 backdrop-blur-sm border border-border/40 rounded-2xl p-1">
        <TabsTrigger
          value="public"
          className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 font-semibold text-xs sm:text-sm"
        >
          <Globe2 className="w-4 h-4" />
          <span className="hidden sm:inline">Fil public</span>
          <span className="sm:hidden">Public</span>
        </TabsTrigger>
        <TabsTrigger
          value="mine"
          className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 font-semibold text-xs sm:text-sm"
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Mes Tweens</span>
          <span className="sm:hidden">Mes</span>
        </TabsTrigger>
        <TabsTrigger
          value="favorites"
          className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 font-semibold text-xs sm:text-sm"
        >
          <Bookmark className="w-4 h-4" />
          <span>Favoris</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="public" className="space-y-4 mt-0">
        <TweenComposer />

        {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/10 flex items-center justify-center backdrop-blur-sm"
          >
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground font-medium">Chargement du feed…</p>
        </div>
      ) : tweens.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-6"
        >
          <div className="w-20 h-20 mx-auto mb-5 rounded-[24px] bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary/40" />
          </div>
          <p className="text-lg font-black" style={{ fontFamily: 'Syne, sans-serif' }}>Pas encore de Tween</p>
          <p className="text-sm text-muted-foreground mt-1.5">Soyez le premier à publier !</p>
        </motion.div>
      ) : (
        tweens.map((tween, index) => {
          // Insert a large sponsored card every 5 tweens (Facebook/TikTok style)
          const showAd = index > 0 && (index + 1) % 5 === 0;
          const adOffset = Math.floor((index + 1) / 5);
          return (
            <motion.div
              key={tween.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.3 }}
            >
              <TweenCard tween={tween} />
              {showAd && (
                <AdBanner placement="sponsored_card" index={adOffset} className="mt-4" />
              )}
            </motion.div>
          );
        })
      )}

        <div ref={sentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </TabsContent>

      <TabsContent value="mine" className="mt-0">
        <MyTweensTab />
      </TabsContent>

      <TabsContent value="favorites" className="mt-0">
        <TweenFavoritesTab />
      </TabsContent>
    </Tabs>
  );
};

export default TweenFeed;
