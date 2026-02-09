import { useEffect, useCallback, useRef } from 'react';

interface MobileScreenshotDetectionOptions {
  enabled?: boolean;
  onScreenshotDetected?: () => void;
}

/**
 * Advanced mobile screenshot detection hook
 * Detects screenshots taken via physical buttons (volume + power) on iOS/Android
 * Uses multiple detection methods:
 * 1. Window blur (app loses focus briefly during screenshot)
 * 2. Window resize (some devices resize during screenshot animation)
 * 3. Touch cancel (touch events are cancelled during screenshot)
 * 4. Page hide (iOS Safari triggers this during screenshot)
 * 5. Focus/Blur rapid succession
 */
export const useMobileScreenshotDetection = ({
  enabled = true,
  onScreenshotDetected,
}: MobileScreenshotDetectionOptions = {}) => {
  const lastBlurTimeRef = useRef<number>(0);
  const lastFocusTimeRef = useRef<number>(0);
  const blurCountRef = useRef<number>(0);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const touchActiveRef = useRef<boolean>(false);

  const triggerDetection = useCallback(() => {
    if (onScreenshotDetected) {
      onScreenshotDetected();
    }
  }, [onScreenshotDetected]);

  useEffect(() => {
    if (!enabled) return;

    // Store initial dimensions
    initialDimensionsRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // 1. BLUR/FOCUS DETECTION
    // On iOS/Android, taking a screenshot briefly blurs the window
    // Use much stricter thresholds to avoid false positives
    const handleBlur = () => {
      lastBlurTimeRef.current = Date.now();
    };

    const handleFocus = () => {
      lastFocusTimeRef.current = Date.now();
      const timeBetween = lastFocusTimeRef.current - lastBlurTimeRef.current;
      
      // Only very specific timing range (100-300ms is typical for screenshot)
      if (timeBetween > 100 && timeBetween < 300) {
        blurCountRef.current++;
        // Require 2+ rapid cycles to reduce false positives
        if (blurCountRef.current >= 2) {
          console.log('[Screenshot Detection] Multiple rapid blur-focus cycles detected');
          triggerDetection();
          blurCountRef.current = 0;
        }
        // Reset counter after 2 seconds if no more cycles
        setTimeout(() => {
          blurCountRef.current = 0;
        }, 2000);
      }
    };

    // 2. VISIBILITY CHANGE - DISABLED for regular browsing
    // This caused too many false positives (switching tabs, apps, etc.)
    // Only keyboard shortcuts are reliable for desktop detection
    const handleVisibilityChange = () => {
      // No-op: removed to prevent false positives
    };

    // 3. RESIZE DETECTION
    // Some devices slightly resize during screenshot animation
    const handleResize = () => {
      if (!initialDimensionsRef.current) return;
      
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const { width: initialWidth, height: initialHeight } = initialDimensionsRef.current;
      
      // Check for tiny resize (1-5px difference is suspicious)
      const widthDiff = Math.abs(currentWidth - initialWidth);
      const heightDiff = Math.abs(currentHeight - initialHeight);
      
      if (widthDiff > 0 && widthDiff < 10 && heightDiff < 10) {
        // Wait to see if it snaps back (screenshot animation)
        resizeTimeoutRef.current = setTimeout(() => {
          const newWidth = window.innerWidth;
          const newHeight = window.innerHeight;
          
          // If dimensions returned to original, it was likely a screenshot
          if (newWidth === initialWidth && newHeight === initialHeight) {
            console.log('[Screenshot Detection] Resize snap-back detected');
            triggerDetection();
          }
        }, 200);
      }
    };

    // 4. TOUCH CANCEL DETECTION
    // Screenshot during touch can cancel touch events
    const handleTouchStart = () => {
      touchActiveRef.current = true;
    };

    const handleTouchEnd = () => {
      touchActiveRef.current = false;
    };

    const handleTouchCancel = () => {
      if (touchActiveRef.current) {
        console.log('[Screenshot Detection] Touch cancelled (potential screenshot)');
        // Touch cancel alone is not conclusive, but combined with other signals is suspicious
        touchActiveRef.current = false;
      }
    };

    // 5. PAGE HIDE (iOS specific)
    const handlePageHide = () => {
      const now = Date.now();
      // Store and check on pageshow
      (window as any).__pageHideTime = now;
    };

    const handlePageShow = () => {
      const hideTime = (window as any).__pageHideTime;
      if (hideTime) {
        const duration = Date.now() - hideTime;
        // Very quick hide/show (< 500ms) is suspicious
        if (duration < 500) {
          console.log('[Screenshot Detection] Quick page hide/show:', duration, 'ms');
          triggerDetection();
        }
        delete (window as any).__pageHideTime;
      }
    };

    // 6. KEYBOARD SHORTCUT DETECTION (desktop + some mobile)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
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
      
      // Windows: Win+PrintScreen, Win+Shift+S
      if ((e.metaKey || e.key === 'Meta') && e.key === 'PrintScreen') {
        e.preventDefault();
        console.log('[Screenshot Detection] Windows screenshot shortcut');
        triggerDetection();
        return;
      }
      
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        console.log('[Screenshot Detection] Win+Shift+S detected');
        triggerDetection();
        return;
      }
    };

    // Register all listeners
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('keydown', handleKeyDown, true);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [enabled, triggerDetection]);

  return { triggerDetection };
};

export default useMobileScreenshotDetection;
