import { useEffect, useCallback, useState } from 'react';

interface ScreenshotViolation {
  count: number;
  suspendedUntil: Date | null;
}

export const useScreenshotProtection = () => {
  const [violations, setViolations] = useState<ScreenshotViolation>(() => {
    const stored = localStorage.getItem('screenshot_violations');
    if (stored) {
      const data = JSON.parse(stored);
      return {
        ...data,
        suspendedUntil: data.suspendedUntil ? new Date(data.suspendedUntil) : null,
      };
    }
    return { count: 0, suspendedUntil: null };
  });

  const [isSuspended, setIsSuspended] = useState(false);

  // Check suspension status
  useEffect(() => {
    if (violations.suspendedUntil) {
      const now = new Date();
      if (now < violations.suspendedUntil) {
        setIsSuspended(true);
        const timeout = setTimeout(() => {
          setIsSuspended(false);
        }, violations.suspendedUntil.getTime() - now.getTime());
        return () => clearTimeout(timeout);
      } else {
        setIsSuspended(false);
      }
    }
  }, [violations.suspendedUntil]);

  const handleViolation = useCallback(() => {
    setViolations((prev) => {
      const newCount = prev.count + 1;
      let suspendedUntil: Date | null = null;

      if (newCount === 1) {
        // First violation: 10 minutes
        suspendedUntil = new Date(Date.now() + 10 * 60 * 1000);
      } else if (newCount === 2) {
        // Second violation: 10 hours
        suspendedUntil = new Date(Date.now() + 10 * 60 * 60 * 1000);
      } else if (newCount >= 3) {
        // Third+ violation: 1 month
        suspendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const newViolations = { count: newCount, suspendedUntil };
      localStorage.setItem('screenshot_violations', JSON.stringify(newViolations));
      return newViolations;
    });
  }, []);

  // Detect screenshot attempts (keyboard shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect PrintScreen, Cmd+Shift+3/4 (Mac), etc.
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
        (e.ctrlKey && e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        handleViolation();
      }
    };

    // Detect visibility change (potential screenshot on mobile)
    const handleVisibilityChange = () => {
      // This is a heuristic - not always a screenshot
      // Could be combined with other signals
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleViolation]);

  // Disable right-click on protected content
  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const getSuspensionTimeLeft = useCallback(() => {
    if (!violations.suspendedUntil) return null;
    const now = new Date();
    if (now >= violations.suspendedUntil) return null;
    
    const diff = violations.suspendedUntil.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} jour${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} minutes`;
  }, [violations.suspendedUntil]);

  return {
    isSuspended,
    violationCount: violations.count,
    suspendedUntil: violations.suspendedUntil,
    getSuspensionTimeLeft,
    preventContextMenu,
    handleViolation, // For testing
  };
};
