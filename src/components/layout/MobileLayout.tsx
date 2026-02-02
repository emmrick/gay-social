import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  hasBottomNav?: boolean;
  noPadding?: boolean;
}

/**
 * MobileLayout - Wrapper component for consistent mobile layout
 * Handles safe areas, bottom nav spacing, and prevents horizontal overflow
 */
const MobileLayout = ({ 
  children, 
  className,
  hasBottomNav = true,
  noPadding = false 
}: MobileLayoutProps) => {
  return (
    <div 
      className={cn(
        "mobile-app-shell flex flex-col bg-background",
        hasBottomNav && "bottom-nav-spacing",
        className
      )}
      style={{
        paddingLeft: noPadding ? undefined : 'env(safe-area-inset-left, 0px)',
        paddingRight: noPadding ? undefined : 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </div>
  );
};

export default MobileLayout;
