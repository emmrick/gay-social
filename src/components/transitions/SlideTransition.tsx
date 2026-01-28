import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SlideTransitionProps {
  children: ReactNode;
  direction?: 'left' | 'right';
  className?: string;
}

const SlideTransition = ({ children, direction = 'right', className = '' }: SlideTransitionProps) => {
  const x = direction === 'right' ? '100%' : '-100%';

  return (
    <motion.div
      initial={{ x, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'right' ? '-100%' : '100%', opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default SlideTransition;
