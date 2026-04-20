import { useCallback, useRef } from 'react';

/**
 * Long-press helper réutilisable pour mobile + desktop (touch + mouse).
 */
export const useLongPress = (
  onLongPress: () => void,
  options: { delay?: number; onClick?: () => void } = {},
) => {
  const { delay = 450, onClick } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const triggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    triggeredRef.current = false;
    if ('touches' in e) {
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      startPosRef.current = { x: e.clientX, y: e.clientY };
    }
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      // Vibration tactile sur mobile si supporté
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate?.(15); } catch { /* noop */ }
      }
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current || !timerRef.current) return;
    const x = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (x == null || y == null) return;
    const dx = Math.abs(x - startPosRef.current.x);
    const dy = Math.abs(y - startPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (triggeredRef.current) return;
    onClick?.();
  }, [onClick]);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      triggeredRef.current = true;
      onLongPress();
    },
    onClick: handleClick,
  };
};
