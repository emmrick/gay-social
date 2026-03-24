import { useEffect, useRef, useCallback } from 'react';
import { useTweenFeed } from '@/hooks/useTweens';
import TweenCard from './TweenCard';
import TweenComposer from './TweenComposer';
import { Loader2 } from 'lucide-react';

const TweenFeed = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useTweenFeed();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
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
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : tweens.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-semibold">Pas encore de Tween</p>
          <p className="text-sm text-muted-foreground mt-1">Soyez le premier à publier !</p>
        </div>
      ) : (
        tweens.map((tween) => (
          <TweenCard key={tween.id} tween={tween} />
        ))
      )}

      {/* Infinite scroll sentinel */}
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
