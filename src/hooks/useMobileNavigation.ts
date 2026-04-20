import { useEffect, useRef } from 'react';

interface UseMobileNavigationOptions {
  onBack?: () => void;
  enabled?: boolean;
  enableSwipeBack?: boolean;
}

/**
 * Mobile navigation hook robuste :
 * - Pousse UNE sentinelle d'historique unique par instance (clé randomisée).
 * - Au popstate, si on quitte notre sentinelle, on appelle onBack() UNE seule fois.
 * - Au démontage, si la sentinelle est toujours en haut de la pile, on la consomme
 *   silencieusement via history.back() pour ne pas polluer l'historique.
 * - Empêche les doubles déclenchements via un flag de garde.
 */
export const useMobileNavigation = ({ 
  onBack, 
  enabled = true, 
  enableSwipeBack = true 
}: UseMobileNavigationOptions) => {
  const sentinelKeyRef = useRef<string | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !onBack) return;

    // Génère une clé unique pour cette instance
    const key = `nav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sentinelKeyRef.current = key;
    triggeredRef.current = false;

    // Pousse la sentinelle
    window.history.pushState({ navSentinel: key }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Si notre sentinelle vient d'être consommée (l'état actuel ne la contient plus)
      const currentState = e.state;
      const isOurSentinelGone = !currentState || currentState.navSentinel !== key;
      
      if (isOurSentinelGone && !triggeredRef.current) {
        triggeredRef.current = true;
        onBack();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // Si notre sentinelle est toujours active (démontage sans pop), on la retire
      if (
        !triggeredRef.current &&
        window.history.state?.navSentinel === key
      ) {
        // Retire silencieusement la sentinelle de la pile
        window.history.back();
      }
      sentinelKeyRef.current = null;
    };
  }, [onBack, enabled]);

  // Swipe gesture détection (bord gauche → droite)
  useEffect(() => {
    if (!enabled || !onBack || !enableSwipeBack) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const minSwipeDistance = 80;
    const maxVerticalMovement = 100;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX = e.touches[0].clientX;
      touchEndY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = Math.abs(touchEndY - touchStartY);
      
      if (
        touchStartX < 30 &&
        deltaX > minSwipeDistance &&
        deltaY < maxVerticalMovement
      ) {
        // Déclenche le retour natif (qui consommera notre sentinelle)
        window.history.back();
      }
      
      touchStartX = 0;
      touchStartY = 0;
      touchEndX = 0;
      touchEndY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onBack, enableSwipeBack]);
};

export default useMobileNavigation;
