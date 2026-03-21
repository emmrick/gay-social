import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const InitialLoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Minimal splash - just wait for DOM ready then fade out
    const complete = () => {
      setVisible(false);
      setTimeout(onComplete, 150);
    };

    if (document.readyState === 'complete') {
      // Already loaded, show splash briefly
      requestAnimationFrame(() => setTimeout(complete, 200));
    } else {
      window.addEventListener('load', () => setTimeout(complete, 100));
      // Fallback: don't block more than 400ms
      const fallback = setTimeout(complete, 400);
      return () => clearTimeout(fallback);
    }
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-[99999] bg-background flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Gay Social
            </h1>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitialLoadingScreen;
