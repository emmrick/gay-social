import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SlideTransitionProps {
  children: ReactNode;
  direction?: 'left' | 'right';
  className?: string;
}

const SlideTransition = ({ children, direction = 'right', className = '' }: SlideTransitionProps) => {
  return (
    <motion.div
      initial={{ x: direction === 'right' ? '30%' : '-30%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'right' ? '-30%' : '30%', opacity: 0 }}
      transition={{
        type: 'tween',
        duration: 0.15,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default SlideTransition;
