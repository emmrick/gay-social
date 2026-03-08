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

// Synthesize real notification sounds using Web Audio API
const synthesizeSound = (type: NotificationSoundType, volume = 0.5): void => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    switch (type) {
      case 'default': {
        // Classic tri-tone notification (like iMessage)
        const freqs = [880, 1108.73, 1318.51]; // A5, C#6, E6
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
          g.gain.linearRampToValueAtTime(volume * 0.6, ctx.currentTime + i * 0.12 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
        setTimeout(() => ctx.close(), 600);
        break;
      }
      case 'soft': {
        // Gentle rising tone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
        setTimeout(() => ctx.close(), 500);
        break;
      }
      case 'chime': {
        // Melodic chime (two harmonious notes)
        const notes = [
          { freq: 1046.5, delay: 0, dur: 0.4 },    // C6
          { freq: 1318.51, delay: 0.15, dur: 0.4 }, // E6
          { freq: 1567.98, delay: 0.3, dur: 0.5 },  // G6
        ];
        notes.forEach(({ freq, delay, dur }) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          g.gain.setValueAtTime(0, ctx.currentTime + delay);
          g.gain.linearRampToValueAtTime(volume * 0.45, ctx.currentTime + delay + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + dur + 0.05);
        });
        setTimeout(() => ctx.close(), 900);
        break;
      }
      case 'pop': {
        // Modern pop/bubble sound
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(volume * 0.7, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);

        // Second pop
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1400, ctx.currentTime + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        g2.gain.setValueAtTime(volume * 0.5, ctx.currentTime + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.3);

        setTimeout(() => ctx.close(), 400);
        break;
      }
      case 'bell': {
        // Bell/gong with harmonics
        const fundamentalFreq = 830; // ~Ab5
        [1, 2.0, 3.0, 4.2].forEach((harmonic, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(fundamentalFreq * harmonic, ctx.currentTime);
          const harmonicVol = volume * 0.5 / (i + 1);
          g.gain.setValueAtTime(harmonicVol, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8 / (i + 1));
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1);
        });
        setTimeout(() => ctx.close(), 1100);
        break;
      }
    }
  } catch (error) {
    console.error('Error synthesizing notification sound:', error);
  }
};

export const useNotificationSound = () => {
  const { preferences } = useNotificationPreferences();

  const playNotificationSound = useCallback(() => {
    const localSoundEnabled = localStorage.getItem('notification_sound_enabled');
    const soundEnabled = localSoundEnabled !== null 
      ? localSoundEnabled === 'true' 
      : preferences?.sound_enabled !== false;
    
    const soundType = (localStorage.getItem('notification_sound_type') || preferences?.notification_sound || 'default') as NotificationSoundType;

    if (!soundEnabled || soundType === 'none') return;

    synthesizeSound(soundType, 0.5);
  }, [preferences?.sound_enabled, preferences?.notification_sound]);

  const previewSound = useCallback((soundType: NotificationSoundType) => {
    if (soundType === 'none') return;
    synthesizeSound(soundType, 0.5);
  }, []);

  return { playNotificationSound, previewSound };
};

// Standalone function to play sound without hooks (for realtime callbacks)
export const playNotificationSoundStandalone = () => {
  const localSoundEnabled = localStorage.getItem('notification_sound_enabled');
  if (localSoundEnabled === 'false') return;

  const soundType = (localStorage.getItem('notification_sound_type') || 'default') as NotificationSoundType;
  if (soundType === 'none') return;

  synthesizeSound(soundType, 0.5);
};

// Standalone function for announcement channel chime
export const playAnnouncementSoundStandalone = () => {
  const localSoundEnabled = localStorage.getItem('notification_sound_enabled');
  if (localSoundEnabled === 'false') return;

  synthesizeSound('chime', 0.7);
};
