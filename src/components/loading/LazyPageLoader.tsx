import { Suspense, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LazyPageLoaderProps {
  children: ReactNode;
}

// Minimal fallback for lazy loaded components
export const PageFallback = () => (
  <motion.div 
    className="flex-1 flex items-center justify-center min-h-[200px]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2 }}
  >
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </motion.div>
);

const LazyPageLoader = ({ children }: LazyPageLoaderProps) => {
  return (
    <Suspense fallback={<PageFallback />}>
      {children}
    </Suspense>
  );
};

export default LazyPageLoader;
