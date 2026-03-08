import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Preventive Screenshot Blur Protection
 * 
 * SIMPLIFIED: Removed unreliable frame-drop monitoring that caused false positives.
 * Frame drops happen frequently during normal usage (scrolling, animations, heavy renders)
 * and were incorrectly flagged as screenshot attempts.
 * 
 * Remaining features:
 * 1. Visual shield when app goes to background (app switcher protection)
 * 2. Screen recording detection via MediaDevices API
 */

interface PreventiveBlurOptions {
  enabled?: boolean;
  onThreatDetected?: () => void;
}

export const usePreventiveScreenshotBlur = ({
  enabled = true,
  onThreatDetected,
}: PreventiveBlurOptions = {}) => {
  const isRecordingRef = useRef<boolean>(false);
  const [showProtection, setShowProtection] = useState(false);
  const cooldownRef = useRef<boolean>(false);

  const triggerProtection = useCallback(() => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;

    setShowProtection(true);
    onThreatDetected?.();

    setTimeout(() => {
      setShowProtection(false);
      cooldownRef.current = false;
    }, 5000);
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

  useEffect(() => {
    if (!enabled) return;

    // Check for screen recording periodically
    const recordingCheckInterval = setInterval(checkScreenRecording, 5000);

    // Visual shield when app goes to background (app switcher)
    // This does NOT trigger onThreatDetected - just a visual protection
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setShowProtection(true);
      } else {
        setTimeout(() => setShowProtection(false), 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(recordingCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, checkScreenRecording]);

  return { showProtection, isRecording: isRecordingRef.current };
};

export default usePreventiveScreenshotBlur;
