import { useEffect, useCallback, useRef } from 'react';

interface MobileScreenshotDetectionOptions {
  enabled?: boolean;
  onScreenshotDetected?: () => void;
}

/**
 * Screenshot detection hook - ONLY reliable methods
 * 
 * IMPORTANT: Heuristic methods (blur/focus timing, visibility changes, frame drops,
 * resize snap-back) have been REMOVED because they caused massive false positives.
 * These events are triggered by normal user actions: receiving a notification,
 * switching apps briefly, scroll lag, keyboard appearing, etc.
 * 
 * Reliable detection methods kept:
 * 1. Keyboard shortcuts (desktop: PrintScreen, Cmd+Shift+3/4/5, Win+Shift+S)
 * 2. Navigator.clipboard API monitoring (when available)
 * 
 * For ephemeral media, the in-viewer screenshot detection (EphemeralMediaViewer)
 * uses its own callback which is separate from this hook.
 */
export const useMobileScreenshotDetection = ({
  enabled = true,
  onScreenshotDetected,
}: MobileScreenshotDetectionOptions = {}) => {
  const cooldownRef = useRef<boolean>(false);

  const triggerDetection = useCallback(() => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 5000);

    if (onScreenshotDetected) {
      onScreenshotDetected();
    }
  }, [onScreenshotDetected]);

  useEffect(() => {
    if (!enabled) return;

    // ONLY keyboard shortcut detection (reliable on desktop)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        console.log('[Screenshot Detection] PrintScreen key');
        triggerDetection();
        return;
      }
      
      // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        console.log('[Screenshot Detection] Mac screenshot shortcut');
        triggerDetection();
        return;
      }
      
      // Windows: Win+Shift+S
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        console.log('[Screenshot Detection] Win+Shift+S detected');
        triggerDetection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, triggerDetection]);

  return { triggerDetection };
};

export default useMobileScreenshotDetection;
