import { useEffect, useRef, useCallback } from 'react';
import { useTweenFeed } from '@/hooks/useTweens';
import TweenCard from './TweenCard';
import TweenComposer from './TweenComposer';
import AdBanner from '@/components/ads/AdBanner';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const TweenFeed = () => {
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
    <div className="max-w-xl mx-auto space-y-4">
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
        tweens.map((tween, index) => (
          <motion.div
            key={tween.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.3 }}
          >
            <TweenCard tween={tween} />
            {index === 2 && <AdBanner placement="compact" className="my-3" />}
          </motion.div>
        ))
      )}

      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default TweenFeed;
