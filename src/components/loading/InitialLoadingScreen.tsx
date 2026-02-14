import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const InitialLoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Simulate progress that accelerates as resources load
    let frame: number;
    let start: number | null = null;
    const duration = 2200; // Base duration in ms

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      // Ease-out curve for natural feel
      const raw = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(Math.min(eased * 100, 100));

      if (raw < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        // Hold at 100% briefly then dismiss
        setTimeout(() => {
          setVisible(false);
          setTimeout(onComplete, 500); // Wait for exit animation
        }, 300);
      }
    };

    // Wait for DOM content + initial resources
    const startLoading = () => {
      frame = requestAnimationFrame(tick);
    };

    if (document.readyState === 'complete') {
      startLoading();
    } else {
      window.addEventListener('load', startLoading);
      // Fallback: start anyway after 500ms
      const fallback = setTimeout(startLoading, 500);
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
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-background flex flex-col items-center justify-center"
        >
          {/* Logo / Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6 mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <motion.span
                className="text-3xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                💬
              </motion.span>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Gay Connect
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Chargement en cours...
              </p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="w-64 max-w-[80vw]">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <motion.p
              className="text-xs text-muted-foreground text-center mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {progress < 100 ? `${Math.round(progress)}%` : 'C\'est prêt !'}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitialLoadingScreen;
