import { useCallback } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';

// Define available notification sounds
export type NotificationSoundType = 'default' | 'soft' | 'chime' | 'pop' | 'bell' | 'none';

export const NOTIFICATION_SOUNDS: { id: NotificationSoundType; name: string; description: string }[] = [
  { id: 'default', name: 'Par défaut', description: 'Tri-tone élégant' },
  { id: 'soft', name: 'Doux', description: 'Souffle léger et chaud' },
  { id: 'chime', name: 'Carillon', description: 'Notes cristallines' },
  { id: 'pop', name: 'Pop', description: 'Bulle moderne' },
  { id: 'bell', name: 'Cloche', description: 'Cloche réaliste' },
  { id: 'none', name: 'Aucun', description: 'Notifications silencieuses' },
];

// ───────────────────────────────────────────────────────────────────────────
// Audio engine (singleton AudioContext + small reverb for warmth)
// ───────────────────────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  try {
    if (typeof window === 'undefined') return null;
    if (!_ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      _ctx = new Ctor();
    }
    if (_ctx.state === 'suspended') {
      void _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
};

/** Small in-memory impulse for a subtle, short room reverb. */
let _reverbBuffer: AudioBuffer | null = null;
const getReverbBuffer = (ctx: AudioContext): AudioBuffer => {
  if (_reverbBuffer && _reverbBuffer.sampleRate === ctx.sampleRate) return _reverbBuffer;
  const duration = 0.6; // short, intimate room
  const decay = 2.5;
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Random noise * exponential decay (smooth tail)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  _reverbBuffer = buffer;
  return buffer;
};

interface NoteOptions {
  freq: number;
  start?: number;       // seconds from now
  duration?: number;    // total time including release
  volume?: number;      // peak gain (0..1)
  type?: OscillatorType;
  detune?: number;      // cents
  attack?: number;
  release?: number;
  filterFreq?: number;  // low-pass cutoff
}

/**
 * Plays a single shaped note with ADSR + low-pass filter routed through
 * a master gain and a parallel reverb send.
 */
const playNote = (
  ctx: AudioContext,
  master: GainNode,
  reverbSend: GainNode,
  opts: NoteOptions
) => {
  const {
    freq,
    start = 0,
    duration = 0.4,
    volume = 0.35,
    type = 'sine',
    detune = 0,
    attack = 0.008,
    release = Math.max(0.08, duration - attack),
    filterFreq = 6000,
  } = opts;

  const t0 = ctx.currentTime + start;
  const tEnd = t0 + duration;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (detune) osc.detune.setValueAtTime(detune, t0);

  // Subtle low-pass to remove harsh upper harmonics
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  filter.Q.setValueAtTime(0.7, t0);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);

  osc.connect(filter);
  filter.connect(env);
  env.connect(master);
  // small parallel reverb send for warmth
  env.connect(reverbSend);

  osc.start(t0);
  osc.stop(tEnd + 0.05);
};

const synthesizeSound = (type: NotificationSoundType, volume = 0.5): void => {
  const ctx = getCtx();
  if (!ctx) return;

  try {
    // Master chain with slow declick fade-out
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.connect(ctx.destination);

    // Reverb chain (parallel) — keeps onset crisp, adds tail
    const convolver = ctx.createConvolver();
    convolver.buffer = getReverbBuffer(ctx);
    const reverbSend = ctx.createGain();
    const reverbReturn = ctx.createGain();
    reverbSend.gain.setValueAtTime(0.18, ctx.currentTime);
    reverbReturn.gain.setValueAtTime(0.55, ctx.currentTime);
    reverbSend.connect(convolver);
    convolver.connect(reverbReturn);
    reverbReturn.connect(ctx.destination);

    let totalDuration = 0.6;

    switch (type) {
      case 'default': {
        // Modern tri-tone — perfect 5th + octave (D5 → A5 → D6) on sine+triangle
        const notes = [
          { freq: 587.33, t: 0.00 }, // D5
          { freq: 880.00, t: 0.10 }, // A5
          { freq: 1174.66, t: 0.20 }, // D6
        ];
        notes.forEach(({ freq, t }, i) => {
          // Body (sine)
          playNote(ctx, master, reverbSend, {
            freq,
            start: t,
            duration: 0.55,
            volume: 0.32 * (1 - i * 0.08),
            type: 'sine',
            attack: 0.006,
            release: 0.5,
            filterFreq: 7000,
          });
          // Subtle harmonic shimmer (triangle, +octave, very low gain)
          playNote(ctx, master, reverbSend, {
            freq: freq * 2,
            start: t,
            duration: 0.35,
            volume: 0.08,
            type: 'triangle',
            attack: 0.004,
            release: 0.3,
            filterFreq: 6000,
          });
        });
        totalDuration = 1.2;
        break;
      }

      case 'soft': {
        // Warm rising sine pad (C5 → E5) with slow attack — like a notification on iOS
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const t0 = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, t0);
        osc.frequency.exponentialRampToValueAtTime(659.25, t0 + 0.25);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3500, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(0.32, t0 + 0.06);
        env.gain.exponentialRampToValueAtTime(0.18, t0 + 0.3);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);

        osc.connect(filter);
        filter.connect(env);
        env.connect(master);
        env.connect(reverbSend);
        osc.start(t0);
        osc.stop(t0 + 0.8);

        // Sub-octave warmth
        playNote(ctx, master, reverbSend, {
          freq: 261.63,
          start: 0,
          duration: 0.6,
          volume: 0.10,
          type: 'sine',
          attack: 0.05,
          release: 0.5,
          filterFreq: 1500,
        });
        totalDuration = 1.0;
        break;
      }

      case 'chime': {
        // Crystalline arpeggio C6 → E6 → G6 → C7 with bell-like harmonics
        const arp = [
          { freq: 1046.50, t: 0.00, dur: 0.55 },
          { freq: 1318.51, t: 0.13, dur: 0.55 },
          { freq: 1567.98, t: 0.26, dur: 0.65 },
          { freq: 2093.00, t: 0.42, dur: 0.85 },
        ];
        arp.forEach(({ freq, t, dur }) => {
          // Fundamental (sine)
          playNote(ctx, master, reverbSend, {
            freq,
            start: t,
            duration: dur,
            volume: 0.28,
            type: 'sine',
            attack: 0.003,
            release: dur - 0.01,
            filterFreq: 8000,
          });
          // 2x harmonic (very quiet, adds shimmer)
          playNote(ctx, master, reverbSend, {
            freq: freq * 2.01,
            start: t,
            duration: dur * 0.6,
            volume: 0.06,
            type: 'sine',
            attack: 0.003,
            release: dur * 0.55,
            filterFreq: 9000,
          });
        });
        totalDuration = 1.6;
        break;
      }

      case 'pop': {
        // Crisp bubble: very short pitch-down sweep + soft "tail" click
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, t0);
        osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.09);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(0.45, t0 + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

        osc.connect(filter);
        filter.connect(env);
        env.connect(master);
        env.connect(reverbSend);
        osc.start(t0);
        osc.stop(t0 + 0.22);

        // Subtle echo "blip" for modern feel
        playNote(ctx, master, reverbSend, {
          freq: 1800,
          start: 0.12,
          duration: 0.10,
          volume: 0.15,
          type: 'sine',
          attack: 0.002,
          release: 0.08,
          filterFreq: 5000,
        });
        totalDuration = 0.5;
        break;
      }

      case 'bell': {
        // Realistic bell using inharmonic partials (Risset-style) with long decay
        const fundamental = 587.33; // D5 strike
        // Ratios approximating a real bell's inharmonic spectrum
        const partials = [
          { ratio: 0.5,  vol: 0.10, decay: 1.8 }, // hum
          { ratio: 1.00, vol: 0.30, decay: 1.5 }, // strike
          { ratio: 2.00, vol: 0.18, decay: 0.9 }, // tierce
          { ratio: 2.40, vol: 0.12, decay: 0.7 },
          { ratio: 3.00, vol: 0.09, decay: 0.5 },
          { ratio: 4.20, vol: 0.05, decay: 0.4 },
        ];
        partials.forEach(({ ratio, vol, decay }) => {
          playNote(ctx, master, reverbSend, {
            freq: fundamental * ratio,
            start: 0,
            duration: decay,
            volume: vol,
            type: 'sine',
            attack: 0.004,
            release: decay - 0.01,
            filterFreq: 8000,
          });
        });
        totalDuration = 2.0;
        break;
      }
    }

    // We share the AudioContext across calls — do NOT close it.
    void totalDuration;
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
