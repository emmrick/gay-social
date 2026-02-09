import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Preventive Screenshot Blur Protection
 * Uses banking-app techniques to make screenshots black/unusable:
 * 
 * 1. Rapid RAF loop that detects frame drops (screenshot causes frame skip)
 * 2. Monitors for screen recording via MediaDevices API
 * 3. Visibility-based protection for active viewing sessions
 */

interface PreventiveBlurOptions {
  enabled?: boolean;
  onThreatDetected?: () => void;
}

export const usePreventiveScreenshotBlur = ({
  enabled = true,
  onThreatDetected,
}: PreventiveBlurOptions = {}) => {
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameDropCountRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const [showProtection, setShowProtection] = useState(false);
  const cooldownRef = useRef<boolean>(false);

  const triggerProtection = useCallback(() => {
    // Cooldown to prevent rapid re-triggers
    if (cooldownRef.current) return;
    cooldownRef.current = true;

    setShowProtection(true);
    onThreatDetected?.();

    setTimeout(() => {
      setShowProtection(false);
      cooldownRef.current = false;
    }, 3000);
  }, [onThreatDetected]);

  // Detect screen recording via navigator.mediaDevices
  const checkScreenRecording = useCallback(async () => {
    try {
      if ('mediaDevices' in navigator) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasScreenCapture = devices.some(
          d => d.kind === 'videoinput' && d.label.toLowerCase().includes('screen')
        );
        if (hasScreenCapture && !isRecordingRef.current) {
          isRecordingRef.current = true;
          console.log('[PreventiveBlur] Screen recording detected');
          triggerProtection();
        }
      }
    } catch (e) {
      // Silently fail
    }
  }, [triggerProtection]);

  // Frame monitoring - screenshots cause frame drops
  const monitorFrames = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Screenshot typically causes 200ms+ frame drop
    // Use 200ms threshold - high enough to avoid scroll lag, low enough to catch screenshots
    if (delta > 200) {
      frameDropCountRef.current++;
      console.log('[PreventiveBlur] Frame drop:', delta.toFixed(0), 'ms, count:', frameDropCountRef.current);
      
      // Require 2 significant drops within a short window
      if (frameDropCountRef.current >= 2) {
        triggerProtection();
        frameDropCountRef.current = 0;
      }
      
      // Reset counter after 1 second if no more drops
      setTimeout(() => {
        frameDropCountRef.current = 0;
      }, 1000);
    }

    rafIdRef.current = requestAnimationFrame(monitorFrames);
  }, [enabled, triggerProtection]);

  useEffect(() => {
    if (!enabled) return;

    // Start frame monitoring
    rafIdRef.current = requestAnimationFrame(monitorFrames);

    // Check for screen recording periodically
    const recordingCheckInterval = setInterval(checkScreenRecording, 2000);

    // Visibility change: show protection when app goes to background
    // This protects content in the app switcher/recent apps view
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Show protection immediately when going to background
        // This ensures the screenshot in app switcher shows black
        setShowProtection(true);
        onThreatDetected?.();
      } else {
        // When returning, keep protection briefly then remove
        setTimeout(() => setShowProtection(false), 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      clearInterval(recordingCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, monitorFrames, checkScreenRecording, onThreatDetected]);

  return { showProtection, isRecording: isRecordingRef.current };
};

export default usePreventiveScreenshotBlur;
