import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppLoadingSkeleton = () => {
  const [showSlowConnection, setShowSlowConnection] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Show "slow connection" message after 3 seconds
    const slowTimer = setTimeout(() => setShowSlowConnection(true), 3000);
    // Show retry button after 8 seconds
    const retryTimer = setTimeout(() => setShowRetry(true), 8000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-14 rounded-full" />
              <Skeleton className="w-9 h-9 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Slow connection indicator */}
        <AnimatePresence>
          {showSlowConnection && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-4 gap-3"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {showRetry ? (
                  <WifiOff className="w-4 h-4 text-destructive" />
                ) : (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Wifi className="w-4 h-4" />
                  </motion.div>
                )}
                <span className="text-sm">
                  {showRetry ? 'Connexion difficile...' : 'Connexion lente...'}
                </span>
              </div>
              
              {showRetry && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick buttons skeleton */}
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="flex-1 h-12 rounded-xl" />
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Grid skeleton - mimics the nearby members grid */}
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <Skeleton 
                className="aspect-square rounded-lg" 
                style={{ animationDelay: `${i * 100}ms` }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-background border-t border-border/50">
        <div className="flex items-center justify-around h-full px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-12 h-2.5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLoadingSkeleton;
