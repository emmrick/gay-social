import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

interface UseMobileNavigationOptions {
  onBack?: () => void;
  enabled?: boolean;
  enableSwipeBack?: boolean;
}

const isNative = () => {
  try {
    return Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

/**
 * Mobile navigation hook robuste :
 * - Pousse UNE sentinelle d'historique unique par instance (clé randomisée).
 * - Au popstate (web) ou backButton (Android natif), si on quitte notre sentinelle,
 *   on appelle onBack() UNE seule fois.
 * - Au démontage, si la sentinelle est toujours en haut de la pile, on la consomme
 *   silencieusement via history.back() pour ne pas polluer l'historique.
 */
export const useMobileNavigation = ({
  onBack,
  enabled = true,
  enableSwipeBack = true,
}: UseMobileNavigationOptions) => {
  const sentinelKeyRef = useRef<string | null>(null);
  const triggeredRef = useRef(false);
  const onBackRef = useRef(onBack);

  // Toujours pointer vers le dernier onBack sans relancer l'effet de sentinelle.
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled || !onBackRef.current) return;

    const key = `nav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sentinelKeyRef.current = key;
    triggeredRef.current = false;

    window.history.pushState({ navSentinel: key }, '', window.location.href);

    const trigger = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      onBackRef.current?.();
    };

    const handlePopState = (e: PopStateEvent) => {
      const currentState = e.state;
      const isOurSentinelGone = !currentState || currentState.navSentinel !== key;
      if (isOurSentinelGone) trigger();
    };

    window.addEventListener('popstate', handlePopState);

    // Capacitor : bouton retour matériel Android
    let removeNativeListener: (() => void) | null = null;
    if (isNative()) {
      const handle = CapacitorApp.addListener('backButton', () => {
        if (window.history.state?.navSentinel === key) {
          window.history.back();
        } else {
          trigger();
        }
      });
      removeNativeListener = () => {
        Promise.resolve(handle).then((h) => h?.remove?.()).catch(() => {});
      };
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      removeNativeListener?.();

      if (
        !triggeredRef.current &&
        window.history.state?.navSentinel === key
      ) {
        window.history.back();
      }
      sentinelKeyRef.current = null;
    };
  }, [enabled]);

  // Swipe gesture (bord gauche → droite) — uniquement web mobile
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
