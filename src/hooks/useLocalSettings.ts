import { useState, useEffect, useCallback } from 'react';

/**
 * Centralized local-only user preferences (UI side only).
 * Stored in localStorage. No backend roundtrip.
 */

export type AccentColor = 'violet' | 'rose' | 'sky' | 'emerald' | 'amber' | 'red';
export type TextSize = 'sm' | 'md' | 'lg';
export type Density = 'comfortable' | 'compact';
export type ChatBackground = 'default' | 'aurora' | 'mesh' | 'solid';
export type Language = 'fr' | 'en' | 'es';

export interface LocalSettings {
  // Notifications
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  messageNotifs: boolean;
  likeNotifs: boolean;
  visitNotifs: boolean;
  reactionNotifs: boolean;
  dndEnabled: boolean;
  dndStart: string; // "22:00"
  dndEnd: string;   // "08:00"
  // Appearance
  darkMode: boolean;
  reducedMotion: boolean;
  accent: AccentColor;
  textSize: TextSize;
  density: Density;
  chatBackground: ChatBackground;
  // Privacy (local-only flags consumed by chat code where applicable)
  readReceipts: boolean;
  typingIndicator: boolean;
  // Language
  language: Language;
}

const DEFAULTS: LocalSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  messageNotifs: true,
  likeNotifs: true,
  visitNotifs: false,
  reactionNotifs: true,
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '08:00',
  darkMode: false,
  reducedMotion: false,
  accent: 'violet',
  textSize: 'md',
  density: 'comfortable',
  chatBackground: 'default',
  readReceipts: true,
  typingIndicator: true,
  language: 'fr',
};

const KEYS: Record<keyof LocalSettings, string> = {
  soundEnabled: 'notifications_sound',
  vibrationEnabled: 'notifications_vibration',
  messageNotifs: 'notifications_messages',
  likeNotifs: 'notifications_likes',
  visitNotifs: 'notifications_visits',
  reactionNotifs: 'notifications_reactions',
  dndEnabled: 'notifications_dnd',
  dndStart: 'notifications_dnd_start',
  dndEnd: 'notifications_dnd_end',
  darkMode: 'theme_dark',
  reducedMotion: 'reduced_motion',
  accent: 'theme_accent',
  textSize: 'theme_text_size',
  density: 'theme_density',
  chatBackground: 'theme_chat_bg',
  readReceipts: 'privacy_read_receipts',
  typingIndicator: 'privacy_typing',
  language: 'app_language',
};

function read<K extends keyof LocalSettings>(k: K): LocalSettings[K] {
  try {
    const raw = localStorage.getItem(KEYS[k]);
    if (raw === null) return DEFAULTS[k];
    if (typeof DEFAULTS[k] === 'boolean') return (raw === 'true') as LocalSettings[K];
    return raw as unknown as LocalSettings[K];
  } catch {
    return DEFAULTS[k];
  }
}

function write<K extends keyof LocalSettings>(k: K, v: LocalSettings[K]) {
  try { localStorage.setItem(KEYS[k], String(v)); } catch {}
}

/** Apply visual settings (accent / text size / density / chat bg) to <html>. */
export function applyVisualSettings(s: Partial<LocalSettings>) {
  const root = document.documentElement;
  if (s.accent) root.setAttribute('data-accent', s.accent);
  if (s.textSize) root.setAttribute('data-text-size', s.textSize);
  if (s.density) root.setAttribute('data-density', s.density);
  if (s.chatBackground) root.setAttribute('data-chat-bg', s.chatBackground);
}

export function useLocalSettings() {
  const [settings, setSettings] = useState<LocalSettings>(() => {
    const init = { ...DEFAULTS };
    (Object.keys(DEFAULTS) as (keyof LocalSettings)[]).forEach((k) => {
      // @ts-expect-error generic narrowing
      init[k] = read(k);
    });
    return init;
  });

  // Apply visual settings on mount + on change
  useEffect(() => {
    applyVisualSettings(settings);
  }, [settings.accent, settings.textSize, settings.density, settings.chatBackground]);

  const set = useCallback(<K extends keyof LocalSettings>(k: K, v: LocalSettings[K]) => {
    write(k, v);
    setSettings((prev) => ({ ...prev, [k]: v }));
  }, []);

  return { settings, set };
}
