import { useEffect, useCallback, useState, useRef } from 'react';
import { useMobileScreenshotDetection } from './useMobileScreenshotDetection';
import { usePreventiveScreenshotBlur } from './usePreventiveScreenshotBlur';
import { enableScreenshotProtection, disableScreenshotProtection } from '@/plugins/ScreenshotBlocker';

/**
 * Screenshot protection hook - Shows black screen on detection
 * No suspension/sanctions, just visual protection
 */
export const useScreenshotProtection = (enableNativeBlock = false, aggressiveDetection = false) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const blockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isProtectionActive, setIsProtectionActive] = useState(false);

  // Handle screenshot detection - just show black screen
  const handleViolation = useCallback(() => {
    console.log('[ScreenshotProtection] Screenshot detected - showing black screen');
    setIsBlocked(true);

    // Keep content blocked for 10 seconds
    if (blockTimeoutRef.current) {
      clearTimeout(blockTimeoutRef.current);
    }
    blockTimeoutRef.current = setTimeout(() => {
      setIsBlocked(false);
    }, 10000);
  }, []);

  // Use advanced mobile screenshot detection - ONLY when aggressive mode is on (ephemeral media)
  useMobileScreenshotDetection({
    enabled: isProtectionActive && aggressiveDetection,
    onScreenshotDetected: () => {
      console.log('[ScreenshotProtection] Mobile screenshot detected!');
      handleViolation();
    },
  });

  // Use preventive blur (banking-style frame detection) - ONLY when aggressive mode is on
  usePreventiveScreenshotBlur({
    enabled: isProtectionActive && aggressiveDetection,
    onThreatDetected: () => {
      console.log('[ScreenshotProtection] Preventive blur triggered!');
      handleViolation();
    },
  });

  // Enable/disable native screenshot blocking (Capacitor)
  const enableProtection = useCallback(async () => {
    setIsProtectionActive(true);
    if (enableNativeBlock) {
      await enableScreenshotProtection();
    }
  }, [enableNativeBlock]);

  const disableProtection = useCallback(async () => {
    setIsProtectionActive(false);
    if (enableNativeBlock) {
      await disableScreenshotProtection();
    }
  }, [enableNativeBlock]);

  // Detect screenshot attempts (keyboard shortcuts)
  useEffect(() => {
    if (!isProtectionActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect PrintScreen, Cmd+Shift+3/4 (Mac), Windows+PrintScreen, etc.
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        (e.ctrlKey && e.key === 'PrintScreen') ||
        (e.metaKey && e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation();
        return false;
      }
    };

    // Prevent right-click globally on protected content
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only prevent on media elements or protected containers
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.closest('[data-protected]')
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
      }
      if (enableNativeBlock) {
        disableScreenshotProtection();
      }
    };
  }, [handleViolation, isProtectionActive, enableNativeBlock]);

  // Disable right-click on protected content
  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // Prevent drag operations
  const preventDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    return false;
  }, []);

  return {
    isBlocked,
    isProtectionActive,
    preventContextMenu,
    preventDrag,
    handleViolation,
    enableProtection,
    disableProtection,
  };
};
