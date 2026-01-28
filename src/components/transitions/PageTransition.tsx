import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  viewKey: string;
  direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  left: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  right: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  up: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  down: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
};

const PageTransition = ({ children, viewKey, direction = 'fade' }: PageTransitionProps) => {
  const variant = variants[direction];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={{
          type: 'tween',
          ease: 'easeInOut',
          duration: 0.25,
        }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
