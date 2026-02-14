import { useIsFetching } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

const BackgroundRefreshIndicator = () => {
  const isFetching = useIsFetching();

  return (
    <AnimatePresence>
      {isFetching > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary/60"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
            }}
            style={{ width: '40%' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackgroundRefreshIndicator;
