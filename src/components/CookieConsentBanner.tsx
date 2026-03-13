import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'gc_cookie_consent';

type ConsentChoice = 'accepted' | 'rejected' | 'custom';

interface CookiePreferences {
  essential: boolean; // always true
  preferences: boolean;
  analytics: boolean;
}

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    preferences: true,
    analytics: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        // Delay to avoid showing immediately on first render
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const saveConsent = (choice: ConsentChoice, prefs: CookiePreferences) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        choice,
        preferences: prefs,
        timestamp: new Date().toISOString(),
      }));
    } catch {}
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent('accepted', { essential: true, preferences: true, analytics: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent('rejected', { essential: true, preferences: false, analytics: false });
  };

  const handleSaveCustom = () => {
    saveConsent('custom', preferences);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4"
      >
        <div className="max-w-lg mx-auto bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-sm text-foreground">🍪 Cookies</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Cookies techniques et fonctionnels uniquement, <strong>aucun traceur tiers</strong>.{' '}
              <button 
                onClick={() => { window.location.href = '/legal#cookies'; }}
                className="text-primary hover:underline"
              >
                En savoir plus
              </button>
            </p>
          </div>

          {/* Details toggle */}
          <div className="px-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Personnaliser mes choix
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="py-2 space-y-2">
                    <label className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-xs font-medium text-foreground">Essentiels</p>
                        <p className="text-[11px] text-muted-foreground">Auth, session, sécurité</p>
                      </div>
                      <div className="text-[11px] text-muted-foreground italic">Obligatoire</div>
                    </label>

                    <label className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer">
                      <div>
                        <p className="text-xs font-medium text-foreground">Préférences</p>
                        <p className="text-[11px] text-muted-foreground">Thème, langue, navigation</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.preferences}
                        onChange={(e) => setPreferences(p => ({ ...p, preferences: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer">
                      <div>
                        <p className="text-xs font-medium text-foreground">Statistiques anonymes</p>
                        <p className="text-[11px] text-muted-foreground">Amélioration du service</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded accent-primary"
                      />
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buttons */}
          <div className="px-4 pb-3 pt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectNonEssential}
              className="flex-1 text-xs"
            >
              Refuser les non-essentiels
            </Button>
            {showDetails ? (
              <Button
                size="sm"
                onClick={handleSaveCustom}
                className="flex-1 text-xs bg-gradient-to-r from-primary to-primary/80"
              >
                Enregistrer mes choix
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 text-xs bg-gradient-to-r from-primary to-primary/80"
              >
                Tout accepter
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
