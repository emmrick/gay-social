import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CookiePreferences {
  necessary: boolean; // Always true
  analytics: boolean;
  advertising: boolean;
}

interface CookieConsentContextType {
  preferences: CookiePreferences;
  hasConsented: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: Partial<CookiePreferences>) => void;
  openSettings: () => void;
  isSettingsOpen: boolean;
  closeSettings: () => void;
}

const STORAGE_KEY = 'cookie_consent';

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  advertising: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
};

export const CookieConsentProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [hasConsented, setHasConsented] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences({ ...parsed, necessary: true });
        setHasConsented(true);
      }
    } catch {}
  }, []);

  const persist = useCallback((prefs: CookiePreferences) => {
    setPreferences(prefs);
    setHasConsented(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, []);

  const acceptAll = useCallback(() => {
    persist({ necessary: true, analytics: true, advertising: true });
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist({ necessary: true, analytics: false, advertising: false });
  }, [persist]);

  const savePreferences = useCallback((prefs: Partial<CookiePreferences>) => {
    persist({ ...preferences, ...prefs, necessary: true });
    setIsSettingsOpen(false);
  }, [preferences, persist]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return (
    <CookieConsentContext.Provider value={{
      preferences,
      hasConsented,
      acceptAll,
      rejectAll,
      savePreferences,
      openSettings,
      isSettingsOpen,
      closeSettings,
    }}>
      {children}
    </CookieConsentContext.Provider>
  );
};
