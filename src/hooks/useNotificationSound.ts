import { useCallback, useRef } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';

// Define available notification sounds
export type NotificationSoundType = 'default' | 'soft' | 'chime' | 'pop' | 'bell' | 'none';

export const NOTIFICATION_SOUNDS: { id: NotificationSoundType; name: string; description: string }[] = [
  { id: 'default', name: 'Par défaut', description: 'Son classique' },
  { id: 'soft', name: 'Doux', description: 'Son subtil' },
  { id: 'chime', name: 'Carillon', description: 'Son mélodique' },
  { id: 'pop', name: 'Pop', description: 'Son moderne' },
  { id: 'bell', name: 'Cloche', description: 'Son traditionnel' },
  { id: 'none', name: 'Aucun', description: 'Notifications silencieuses' },
];

// Sound data URLs (short audio clips encoded as base64)
const SOUND_DATA: Record<NotificationSoundType, string> = {
  // Default ding sound
  default: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU4GAACAhIiMkJSYnKCkqKysrq6urqysqqikoJyYlJCMiISAf35+fn+AgYOFh4mLjY+RkpOTk5OSko+OjImGhIKAf35+fn+AgYOFh4mLjY6PkJCQkI+OjIqHhYKAf35+fn+AgYOFh4mKi4yNjY2MjIuJh4WCgH9+fn5/gIGDhYeIiYqKioqKiYiGhIKAf35+fn+AgYOEhoiIiYmJiYiIhoeEgoB/fn5+f4CBg4SGh4iIiIiIh4aFg4KAf35+fn+AgYOEhYaHh4eHh4aFhIKBf35+fn5/gIGCg4SFhYWFhYWFhIOCgYB/fn5+f4CBgoODhISEhISEhISDgoKBgH9+fn5/gICBgoKDg4ODg4ODg4KCgYGAf35+fn5/gICBgYKCgoKCgoKCgYGBgIB/fn5+fn+AgIGBgYGBgYGBgYGBgICAgH9/fn5+f4CAgICAgICAgICAgICAgICAf39/fn5+f4CAgICAgICAgICAgICAgICAf39/fn5+f3+AgICAgICAgICAgICAgIB/f39/fn5+f3+AgICAgICAgICAgICAgIB/f39/fn5+fn+AgICAgICAgICAgICAgIB/f39/fn5+fn+AgICAgICAgICAgICAgIB/f39/fn5+fn9/gICAgICAgICAgICAgH9/f39+fn5+f3+AgICAgICAgICAgIB/f39/f39+fn5/f4CAgICAgICAgICAgH9/f39/f35+fn5/gICAgICAgICAgICAf39/f39/f35+fn5/gICAgICAgICAgIB/f39/f39/fn5+fn+AgICAgICAgICAgH9/f39/f39+fn5+f4CAgICAgICAgIB/f39/f39/f35+fn5/gICAgICAgICAgH9/f39/f39/fn5+fn9/gICAgICAgICAf39/f39/f39+fn5+f3+AgICAgICAgIB/f39/f39/f35+fn5/f4CAgICAgICAgH9/f39/f39/fn5+fn5/gICAgICAgICAf39/f39/f39/fn5+fn9/gICAgICAgIB/f39/f39/f39+fn5+fn+AgICAgICAgH9/f39/f39/f35+fn5+f4CAgICAgICAf39/f39/f39/fn5+fn5/gICAgICAgIB/f39/f39/f39/fn5+fn5/gICAgICAgH9/f39/f39/f39+fn5+fn9/gICAgICAgH9/f39/f39/f39+fn5+fn9/gICAgICAgH9/f39/f39/f39/fn5+fn5/f4CAgICAgH9/f39/f39/f39/fn5+fn5/f4CAgICAgH9/f39/f39/f39/fn5+fn5+f4CAgICAgH9/f39/f39/f39/f35+fn5+f3+AgICAgH9/f39/f39/f39/f35+fn5+fn+AgICAgH9/f39/f39/f39/f35+fn5+fn9/gICAgH9/f39/f39/f39/f39+fn5+fn5/gICAgH9/f39/f39/f39/f39+fn5+fn5/gICAgH9/f39/f39/f39/f39+fn5+fn5/f4CAgH9/f39/f39/f39/f39/fn5+fn5+f4CAgH9/f39/f39/f39/f39/fn5+fn5+f3+AgH9/f39/f39/f39/f39/fn5+fn5+fn+AgH9/f39/f39/f39/f39/f35+fn5+fn5/gH9/f39/f39/f39/f39/f35+fn5+fn5/gH9/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39+fn5+fn5+f39/f39/f39/f39/f39/f39/fn5+fn5+fn9/f39/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39+fn5+fn5+f39/f39/f39/f39/f39/f39/fn5+fn5+fn9/f39/f39/f39/f39/f39/f35+fn5+fn5/f39/f39/f39/f39/f39/f39+fn5+fn5+f39/f39/f39/f39/f39/f39/fn5+fn5+f39/f39/f39/f39/f39/f39/f35+fn5+fn9/f39/f39/f39/f39/f39/f39+fn5+fn5/f39/f39/f39/f39/f39/f39/fn5+fn5+f39/f39/f39/f39/f39/f39/f35+fn5+fn9/f39/f39/f39/f39/f39/f39+fn5+fn5/f39/f39/f39/f39/f39/f39/fn5+fn5+f39/f39/f39/f39/f39/f39/f39+fn5/f39/f39/f39/f39/f39/f39/f39/fn5+f39/f39/f39/f39/f39/f39/f39/f39+fn5/f39/f39/f39/f39/f39/f39/f39/f39/',
  
  // Soft gentle sound
  soft: 'data:audio/wav;base64,UklGRpADAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWwDAAB/f39/f4CAgICBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiJiYmKioqLi4uMjIyNjY2Ojo6Pj4+QkJCRkZGSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnZ2enp6fn5+goKChoaGioqKjo6OkpKSlpaWmpqanp6eoqKipqamqqqqrq6usrKytra2urq6vr6+wsLCxsbGysrKzs7O0tLS1tbW2tra3t7e4uLi5ubm6urq7u7u8vLy9vb2+vr6/v7/AwMDBwcHCwsLDw8PExMTFxcXGxsbHx8fIyMjJycnKysrLy8vMzMzNzc3Ozs7Pz8/Q0NDR0dHS0tLT09PU1NTV1dXW1tbX19fY2NjZ2dna2trb29vc3Nzd3d3e3t7f39/g4ODh4eHi4uLj4+Pk5OTl5eXm5ubn5+fo6Ojp6enq6urr6+vs7Ozt7e3u7u7v7+/w8PDx8fHy8vLz8/P09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=',
  
  // Chime melodic sound  
  chime: 'data:audio/wav;base64,UklGRsQFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAFAAB/gIGDhYeJi42PkZOVl5mbnZ+hoqSlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7//////v39/Pv6+fj39vX08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQz87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAP///v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==',
  
  // Pop modern sound
  pop: 'data:audio/wav;base64,UklGRoQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWADAACAf35/gIB/f4CAgH9/gICAf3+AgIB/f4CAgH9/gICAf3+AgIB/f4CAgH9/gICAf3+AgIB/f4CAgH9/gICAf3+AgIB/f4CAgH9/gICAf4B/gICAgH9/gIGBgIB/f4CCgoGAf3+Ag4OCgX9+foSFhIN/fX2GiIeFfXt7iYuKiHl4eI2QjoxybnKSl5aTZ19mqaeqpltNUry/wL5GNDPM1NfVMBoZ5/Dz8REAABr/AgD+HBwaAQ8Q/ycpKfomJib/NDQ0/z4+Pv1ERkb6TE5O9lVXV/BeYGDrZ2lo5XByceBzdXbbdnh41Xp7e9N/gIDShISExYqLi7+PkJG6lJWWs5qbnKufn6CknZ6fmp2enpibnZybmp2emJucnZebm52Ym5ucl5qbnZianJyXmpuclZmbnJeam5yWmZqdlpmbnJaam5yXmZucl5mbnJeZm5yXmZqcl5mbnJeZmpyXmZqcl5mbnJeZmpyXmZqcl5mbnJeZmpyXmZqcl5iamZqYmZqal5iZmpeanJyXmpuclpmbnJaZm5yXmZqcl5manJeZmpyXmZucl5manJeZm5yXmZucl5mbnJeZm5yXmZucl5mbnJeZm5yYmJubmJmam5mYmZqamJmampmanJyampuclpmbnJaZm5yXmZucl5mbnJeZm5yXmZuc',
  
  // Bell traditional sound
  bell: 'data:audio/wav;base64,UklGRuQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcAEAAB/gIKFiIuOkZSXmp2foqWoqqyusbO1t7m7vb/BwsTGx8nKy8zNzs/Q0dHS09TU1dbW19fY2NnZ2tra29vb3Nzd3d3e3t7f39/g4ODh4eHi4uLj4+Pk5OTl5eXm5ubn5+fo6Ojp6enq6urr6+vs7Ozt7e3u7u7v7+/w8PDx8fHy8vLz8/P09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AQEBAQICAgIDAwMDBAQEBAUFBQUGBgYGBwcHBwgICAkJCQkKCgoKCwsLCwwMDA0NDQ0ODg4ODw8PEBAQEBERERESEhITExMTFBQUFRUVFRYWFhcXFxcYGBgZGRkaGhoaGxsbHBwcHR0dHR4eHh8fHyAgICAhISEiIiIjIyMkJCQkJSUlJiYmJicnJygoKCkpKSkqKiorKyssLCwtLS0uLi4uLy8vMDAwMTExMjIyMzMzNDQ0NTU1NjY2Nzc3ODg4OTk5Ojo6Ozs7PDw8PT09Pj4+Pz8/QEBAQUFBQUJCQ0NDRERERUVFRkZGR0dHSEhISUlJSkpKS0tLTExMTU1NTk5OT09PUFBQUVFRUlJSU1NTVE5MS0dEQTs4Ni8tKyUiHxkXFA8MCgUDAP79+/n39fLw7uzq6Obl4+Hf3dzb2djX1tXU09LR0M/Ozc3My8rJyMfGxcTDwsHAv769vLu6ubm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYA=',
  
  // No sound
  none: '',
};

export const useNotificationSound = () => {
  const { preferences } = useNotificationPreferences();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    // Check if sounds are enabled - prioritize localStorage for immediate reactivity
    const localSoundEnabled = localStorage.getItem('notification_sound_enabled');
    const soundEnabled = localSoundEnabled !== null 
      ? localSoundEnabled === 'true' 
      : preferences?.sound_enabled !== false;
    
    const soundType = (localStorage.getItem('notification_sound_type') || preferences?.notification_sound || 'default') as NotificationSoundType;

    if (!soundEnabled || soundType === 'none') {
      return;
    }

    const soundData = SOUND_DATA[soundType] || SOUND_DATA.default;
    if (!soundData) return;

    try {
      // Create new audio element for the selected sound
      if (!audioRef.current || audioRef.current.src !== soundData) {
        audioRef.current = new Audio(soundData);
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
  }, [preferences?.sound_enabled, preferences?.notification_sound]);

  const previewSound = useCallback((soundType: NotificationSoundType) => {
    if (soundType === 'none') return;
    
    const soundData = SOUND_DATA[soundType];
    if (!soundData) return;

    try {
      const audio = new Audio(soundData);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Error previewing sound:', error);
    }
  }, []);

  return { playNotificationSound, previewSound };
};

// Standalone function to play sound without hooks (for realtime callbacks)
let cachedAudios: Record<string, HTMLAudioElement> = {};

export const playNotificationSoundStandalone = () => {
  const localSoundEnabled = localStorage.getItem('notification_sound_enabled');
  // Default to true if not set
  if (localSoundEnabled === 'false') return;

  const soundType = (localStorage.getItem('notification_sound_type') || 'default') as NotificationSoundType;
  if (soundType === 'none') return;

  const soundData = SOUND_DATA[soundType] || SOUND_DATA.default;
  if (!soundData) return;

  try {
    if (!cachedAudios[soundType]) {
      cachedAudios[soundType] = new Audio(soundData);
      cachedAudios[soundType].volume = 0.5;
    }
    cachedAudios[soundType].currentTime = 0;
    cachedAudios[soundType].play().catch(() => {});
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Standalone function for announcement channel chime (always plays the chime sound)
export const playAnnouncementSoundStandalone = () => {
  const localSoundEnabled = localStorage.getItem('notification_sound_enabled');
  if (localSoundEnabled === 'false') return;

  const soundData = SOUND_DATA.chime;
  if (!soundData) return;

  try {
    if (!cachedAudios['announcement_chime']) {
      cachedAudios['announcement_chime'] = new Audio(soundData);
      cachedAudios['announcement_chime'].volume = 0.7; // Slightly louder for announcements
    }
    cachedAudios['announcement_chime'].currentTime = 0;
    cachedAudios['announcement_chime'].play().catch(() => {});
  } catch (error) {
    console.error('Error playing announcement sound:', error);
  }
};
