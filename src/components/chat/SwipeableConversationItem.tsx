import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Archive, Trash2, ArchiveRestore } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableConversationItemProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  leftAction: 'archive' | 'restore';
  rightAction: 'delete' | 'restore';
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;

const SwipeableConversationItem = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  disabled = false,
}: SwipeableConversationItemProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  // Transform for background opacity
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  
  // Transform for icon scale
  const leftIconScale = useTransform(x, [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0], [1.2, 1, 0.5]);
  const rightIconScale = useTransform(x, [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5], [0.5, 1, 1.2]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      if (disabled) return;
      
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      
      // Consider both offset and velocity for better UX
      const shouldTriggerLeft = offset < -SWIPE_THRESHOLD || (offset < -40 && velocity < -500);
      const shouldTriggerRight = offset > SWIPE_THRESHOLD || (offset > 40 && velocity > 500);
      
      if (shouldTriggerLeft) {
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
        onSwipeLeft();
      } else if (shouldTriggerRight) {
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
        onSwipeRight();
      }
    },
    [onSwipeLeft, onSwipeRight, disabled]
  );

  const getLeftIcon = () => {
    switch (leftAction) {
      case 'archive':
        return <Archive className="w-6 h-6 text-white" />;
      case 'restore':
        return <ArchiveRestore className="w-6 h-6 text-white" />;
    }
  };

  const getRightIcon = () => {
    switch (rightAction) {
      case 'delete':
        return <Trash2 className="w-6 h-6 text-white" />;
      case 'restore':
        return <ArchiveRestore className="w-6 h-6 text-white" />;
    }
  };

  const getLeftBg = () => {
    return leftAction === 'archive' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getRightBg = () => {
    return rightAction === 'delete' ? 'bg-destructive' : 'bg-green-500';
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-xl">
      {/* Left action background (swipe right to reveal) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start pl-6 w-full",
          getRightBg()
        )}
        style={{ opacity: rightOpacity }}
      >
        <motion.div style={{ scale: rightIconScale }}>
          {getRightIcon()}
        </motion.div>
      </motion.div>

      {/* Right action background (swipe left to reveal) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end pr-6 w-full",
          getLeftBg()
        )}
        style={{ opacity: leftOpacity }}
      >
        <motion.div style={{ scale: leftIconScale }}>
          {getLeftIcon()}
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative z-10 bg-background",
          isDragging && "cursor-grabbing"
        )}
        whileTap={{ cursor: disabled ? 'default' : 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableConversationItem;
