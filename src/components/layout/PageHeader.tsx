import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  rightContent?: ReactNode;
}

/**
 * PageHeader - Consistent header component for all pages
 * Handles safe areas and consistent styling
 */
const PageHeader = ({ 
  title, 
  subtitle, 
  children,
  className,
  rightContent 
}: PageHeaderProps) => {
  return (
    <header 
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50",
        className
      )}
      style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <motion.h2 
            className="font-display text-2xl font-bold text-foreground mb-0.5 truncate"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.h2>
          {subtitle && (
            <motion.p 
              className="text-sm text-muted-foreground truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        {rightContent && (
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>
      {children}
    </header>
  );
};

export default PageHeader;
