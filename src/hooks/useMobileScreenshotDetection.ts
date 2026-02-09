import { useEffect, useCallback, useRef } from 'react';

interface MobileScreenshotDetectionOptions {
  enabled?: boolean;
  onScreenshotDetected?: () => void;
}

/**
 * Advanced mobile screenshot detection hook
 * Detects screenshots taken via physical buttons (volume + power) on iOS/Android
 * Uses multiple detection methods:
 * 1. Window blur/focus rapid succession (screenshot causes brief blur)
 * 2. Window resize snap-back (some devices resize during screenshot)
 * 3. Page hide/show rapid cycle (iOS Safari)
 * 4. Keyboard shortcuts (desktop)
 * 5. Visibility change with short duration (mobile screenshot flash)
 */
export const useMobileScreenshotDetection = ({
  enabled = true,
  onScreenshotDetected,
}: MobileScreenshotDetectionOptions = {}) => {
  const lastBlurTimeRef = useRef<number>(0);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const cooldownRef = useRef<boolean>(false);

  const triggerDetection = useCallback(() => {
    // Cooldown to prevent multiple triggers in quick succession
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 3000);

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
    // On iOS/Android, taking a screenshot briefly blurs the window (100-400ms)
    const handleBlur = () => {
      lastBlurTimeRef.current = Date.now();
    };

    const handleFocus = () => {
      const timeBetween = Date.now() - lastBlurTimeRef.current;
      // Screenshot timing: blur lasts 100-400ms typically
      if (timeBetween > 80 && timeBetween < 400) {
        console.log('[Screenshot Detection] Blur-focus cycle:', timeBetween, 'ms');
        triggerDetection();
      }
    };

    // 2. VISIBILITY CHANGE
    // On mobile, screenshot can briefly hide the page (< 800ms)
    let hiddenTimestamp = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimestamp = Date.now();
      } else if (hiddenTimestamp > 0) {
        const duration = Date.now() - hiddenTimestamp;
        // Very quick hidden→visible (< 800ms) suggests screenshot, not app switch
        if (duration > 50 && duration < 800) {
          console.log('[Screenshot Detection] Quick visibility change:', duration, 'ms');
          triggerDetection();
        }
        hiddenTimestamp = 0;
      }
    };

    // 3. RESIZE DETECTION
    // Some devices slightly resize during screenshot animation
    const handleResize = () => {
      if (!initialDimensionsRef.current) return;
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const { width: initialWidth, height: initialHeight } = initialDimensionsRef.current;
      
      const widthDiff = Math.abs(currentWidth - initialWidth);
      const heightDiff = Math.abs(currentHeight - initialHeight);
      
      // Tiny resize (1-5px) that snaps back = screenshot animation
      if (widthDiff > 0 && widthDiff < 10 && heightDiff < 10) {
        resizeTimeoutRef.current = setTimeout(() => {
          const newWidth = window.innerWidth;
          const newHeight = window.innerHeight;
          if (newWidth === initialWidth && newHeight === initialHeight) {
            console.log('[Screenshot Detection] Resize snap-back detected');
            triggerDetection();
          }
        }, 200);
      }
    };

    // 4. PAGE HIDE/SHOW (iOS specific)
    const handlePageHide = () => {
      (window as any).__pageHideTime = Date.now();
    };

    const handlePageShow = () => {
      const hideTime = (window as any).__pageHideTime;
      if (hideTime) {
        const duration = Date.now() - hideTime;
        if (duration > 50 && duration < 600) {
          console.log('[Screenshot Detection] Quick page hide/show:', duration, 'ms');
          triggerDetection();
        }
        delete (window as any).__pageHideTime;
      }
    };

    // 5. KEYBOARD SHORTCUT DETECTION (desktop)
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

    // Register all listeners
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
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
