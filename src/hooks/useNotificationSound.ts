import { useCallback, useRef } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';

// Notification sound as a base64 data URL (short ding sound)
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU4GAACAhIiMkJSYnKCkqKysrq6urqysqqikoJyYlJCMiISAf35+fn+AgYOFh4mLjY+RkpOTk5OSko+OjImGhIKAf35+fn+AgYOFh4mLjY6PkJCQkI+OjIqHhYKAf35+fn+AgYOFh4mKi4yNjY2MjIuJh4WCgH9+fn5/gIGDhYeIiYqKioqKiYiGhIKAf35+fn+AgYOEhoiIiYmJiYiIhoeEgoB/fn5+f4CBg4SGh4iIiIiIh4aFg4KAf35+fn+AgYOEhYaHh4eHh4aFhIKBf35+fn5/gIGCg4SFhYWFhYWFhIOCgYB/fn5+f4CBgoODhISEhISEhISDgoKBgH9+fn5/gICBgoKDg4ODg4ODg4KCgYGAf35+fn5/gICBgYKCgoKCgoKCgYGBgIB/fn5+fn+AgIGBgYGBgYGBgYGBgICAgH9/fn5+f4CAgICAgICAgICAgICAgICAf39/fn5+f4CAgICAgICAgICAgICAgICAf39/fn5+f3+AgICAgICAgICAgICAgIB/f39/fn5+f3+AgICAgICAgICAgICAgIB/f39/fn5+fn+AgICAgICAgICAgICAgIB/f39/fn5+fn+AgICAgICAgICAgICAgIB/f39/fn5+fn9/gICAgICAgICAgICAgH9/f39+fn5+f3+AgICAgICAgICAgIB/f39/f39+fn5/f4CAgICAgICAgICAgH9/f39/f35+fn5/gICAgICAgICAgICAf39/f39/f35+fn5/gICAgICAgICAgIB/f39/f39/fn5+fn+AgICAgICAgICAgH9/f39/f39+fn5+f4CAgICAgICAgIB/f39/f39/f35+fn5/gICAgICAgICAgH9/f39/f39/fn5+fn9/gICAgICAgICAf39/f39/f39+fn5+f3+AgICAgICAgIB/f39/f39/f35+fn5/f4CAgICAgICAgH9/f39/f39/fn5+fn5/gICAgICAgICAf39/f39/f39/fn5+fn9/gICAgICAgIB/f39/f39/f39+fn5+fn+AgICAgICAgH9/f39/f39/f35+fn5+f4CAgICAgICAf39/f39/f39/fn5+fn5/gICAgICAgIB/f39/f39/f39/fn5+fn5/gICAgICAgH9/f39/f39/f39+fn5+fn9/gICAgICAgH9/f39/f39/f39+fn5+fn9/gICAgICAgH9/f39/f39/f39/fn5+fn5/f4CAgICAgH9/f39/f39/f39/fn5+fn5/f4CAgICAgH9/f39/f39/f39/fn5+fn5+f4CAgICAgH9/f39/f39/f39/f35+fn5+f3+AgICAgH9/f39/f39/f39/f35+fn5+fn+AgICAgH9/f39/f39/f39/f35+fn5+fn9/gICAgH9/f39/f39/f39/f39+fn5+fn5/gICAgH9/f39/f39/f39/f39+fn5+fn5/gICAgH9/f39/f39/f39/f39+fn5+fn5/f4CAgH9/f39/f39/f39/f39/fn5+fn5+f4CAgH9/f39/f39/f39/f39/fn5+fn5+f3+AgH9/f39/f39/f39/f39/fn5+fn5+fn+AgH9/f39/f39/f39/f39/f35+fn5+fn5/gH9/f39/f39/f39/f39/f35+fn5+fn5/gH9/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39+fn5+fn5+f39/f39/f39/f39/f39/f39/fn5+fn5+fn9/f39/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39+fn5+fn5+f39/f39/f39/f39/f39/f39/fn5+fn5+fn9/f39/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39+fn5+fn5+f39/f39/f39/f39/f39/f39/fn5+fn5+fn9/f39/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39/fn5+fn5+f39/f39/f39/f39/f39/f39/f35+fn5+fn9/f39/f39/f39/f39/f39/f39+fn5+fn5/f39/f39/f39/f39/f39/f39/fn5+fn5+f39/f39/f39/f39/f39/f39/f35+fn5+fn9/f39/f39/f39/f39/f39/f39+fn5+fn5/f39/f39/f39/f39/f39/f39/fn5+fn5+f39/f39/f39/f39/f39/f39/f39+fn5+f39/f39/f39/f39/f39/f39/f39/fn5+fn9/f39/f39/f39/f39/f39/f39/f39+fn5/f39/f39/f39/f39/f39/f39/f39/fn5+f39/f39/f39/f39/f39/f39/f39/f39+fn5/f39/f39/f39/f39/f39/f39/f39/f39/';

export const useNotificationSound = () => {
  const { preferences } = useNotificationPreferences();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    // Check if sounds are enabled globally (from localStorage for immediate check)
    const localSoundEnabled = localStorage.getItem('notifications_sound') !== 'false';
    const prefSoundEnabled = preferences?.sound_enabled !== false;

    if (!localSoundEnabled || !prefSoundEnabled) {
      return;
    }

    try {
      // Reuse audio element or create new one
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
        audioRef.current.volume = 0.5;
      }

      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // Ignore autoplay errors (user hasn't interacted with page)
        console.log('Could not play notification sound:', err.message);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [preferences?.sound_enabled]);

  return { playNotificationSound };
};

// Standalone function to play sound without hooks (for realtime callbacks)
let cachedAudio: HTMLAudioElement | null = null;

export const playNotificationSoundStandalone = () => {
  const localSoundEnabled = localStorage.getItem('notifications_sound') !== 'false';
  if (!localSoundEnabled) return;

  try {
    if (!cachedAudio) {
      cachedAudio = new Audio(NOTIFICATION_SOUND_BASE64);
      cachedAudio.volume = 0.5;
    }
    cachedAudio.currentTime = 0;
    cachedAudio.play().catch(() => {});
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};
