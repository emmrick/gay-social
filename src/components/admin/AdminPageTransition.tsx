/**
 * AdminPageTransition — wrapper qui anime l'apparition de la page admin
 * à chaque changement de section. Scroll automatique en haut.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export const AdminPageTransition = ({ children, className }: Props) => {
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  // Scroll-to-top au changement de route admin
  useEffect(() => {
    // On scroll le parent scrollable le plus proche (main overflow-auto)
    const main = ref.current?.closest('main');
    if (main && 'scrollTo' in main) {
      main.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location.pathname]);

  return (
    <div
      ref={ref}
      key={location.pathname}
      className={cn('animate-in fade-in slide-in-from-bottom-1 duration-200', className)}
    >
      {children}
    </div>
  );
};
