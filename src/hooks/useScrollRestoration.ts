import { useEffect, useRef } from 'react';

/**
 * Mémoire globale des positions de scroll par clé (pathname).
 * Restaure la position quand l'élément redevient visible.
 */
const scrollPositions = new Map<string, number>();

export const useScrollRestoration = (key: string, isActive: boolean) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // Sauvegarde le scroll en continu quand actif
  useEffect(() => {
    if (!isActive) return;
    const el = ref.current;
    if (!el) return;
    const handler = () => {
      scrollPositions.set(key, el.scrollTop);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [key, isActive]);

  // Restaure le scroll quand on devient actif
  useEffect(() => {
    if (!isActive) return;
    const el = ref.current;
    if (!el) return;
    const saved = scrollPositions.get(key);
    if (saved !== undefined) {
      // Un microtask pour laisser le DOM s'afficher
      requestAnimationFrame(() => {
        if (el) el.scrollTop = saved;
      });
    }
  }, [key, isActive]);

  return ref;
};

export const clearScrollPosition = (key: string) => {
  scrollPositions.delete(key);
};
