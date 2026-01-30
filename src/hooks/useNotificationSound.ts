import { useCallback, useRef } from 'react';

// Base64 encoded notification sound (short pleasant chime)
const NOTIFICATION_SOUND_BASE64 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNTaYhAAAAAAD/+1DEAAAGAAGn9AAAIjxDMP9YAAA0VJQAEBwfB8H4Ph+UOf5c5/l/5QEP/KHP+oEPygIf+UBD8oCH/8oCH/lAQ/8oCAAAAAJCTEnZu4dJAKBIJBIJ//6Q/pD+n/6Q+n/+kOf//5Qf/5c5/B+f/y5znP/z//8oM4Pz/z/y7xnB8odn/n/+XOc4Py5z/z//l/+UOc//8AAAAAN1G72buKBQJBIJBP/0h/SH0//6Q+n/+kOf/5c/g/Pz/+XP+UGcH5c5/5d//lzn//nB+X/5d4zg/KHZ///8uM4P+UGf/+f/8u//5Q5z//wAAAAn/+0DEEgPAAAGkAAAAIAAANIAAAAT+CooP7J3Dpp6Q2AxZQAD/kJABwJQ54EoIKaQTAwhBRSCqmEIKLQWEw0BBOJhYODQ2GR4bKBsfDgwSAwnFguGxkcGygMJxoLBsbHBscGygLJxoMDY4ODg4NlA2UBZONBgcGxwbKA0nGg0ODg4NjZQGk42GBwcHRwbKBsnGg0NjY4ODg2UBZONBocHBwcGxsoGycaDQ4ODg4NlA2ThQYGxwdHBsoDScLDQ4Ojg4ODZQNlA2UDQ4ODo4NlA2ThYaHB0dHB0bKBsnCw0Ojo6OjZQNlAWTjYaHBwdHRwbKBsnGw0ODo6Ojo2UD/+1DEFIPAAAGkAAAAIAAANIAAAARZOFBobHB0cGygNJwsNDg4ODo4OlAWUBZOFhocHB0dHBsoCycbDQ2Ojo4OjZQNk4UGhscHRwcGygLJxsNDg6ODg4OlAWUBZONhocHB0dHRsoGycLDQ4Ojo6OjpQFlA2ThQYGxwdHRwcGygNJxoNDY4ODg4NlAaTjYYHBwdHB0bKBsnGwwODg4ODg2UBZONhgcHB0cHRsoGycbDQ4ODg4OjZQNk4WGhwdHR0dGygLJxsNDg4ODo4NlA2UBQ=';

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playNotificationSound = useCallback(() => {
    // Throttle: don't play more than once per second
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
        audioRef.current.volume = 0.5;
      }

      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // Silently fail if autoplay is blocked
        console.log('Could not play notification sound:', err.message);
      });

      // Also try vibration on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
};
