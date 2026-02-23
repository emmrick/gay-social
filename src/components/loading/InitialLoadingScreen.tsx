import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const InitialLoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 800; // Reduced from 2200ms to 800ms

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const raw = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(Math.min(eased * 100, 100));

      if (raw < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setVisible(false);
        setTimeout(onComplete, 200);
      }
    };

    const startLoading = () => {
      frame = requestAnimationFrame(tick);
    };

    if (document.readyState === 'complete') {
      startLoading();
    } else {
      window.addEventListener('load', startLoading);
      const fallback = setTimeout(startLoading, 300);
      return () => {
        clearTimeout(fallback);
        window.removeEventListener('load', startLoading);
        cancelAnimationFrame(frame);
      };
    }

    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[99999] bg-background flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Gay Connect
              </h1>
            </div>
          </div>

          <div className="w-48 max-w-[70vw]">
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitialLoadingScreen;
