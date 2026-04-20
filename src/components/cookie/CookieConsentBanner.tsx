import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, BarChart3, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { cn } from '@/lib/utils';

const CookieConsentBanner = () => {
  const { hasConsented, acceptAll, rejectAll, savePreferences, isSettingsOpen, openSettings, closeSettings } = useCookieConsent();
  const [analyticsChecked, setAnalyticsChecked] = useState(false);
  const [advertisingChecked, setAdvertisingChecked] = useState(false);
  const [otherDialogOpen, setOtherDialogOpen] = useState(false);

  // Vérifie si la confirmation d'âge est validée. Tant que l'utilisateur n'a pas
  // accepté la modale d'âge (AlertDialog Radix, z-50), on n'affiche PAS le banner
  // cookies (z-[9999]) qui sinon passerait par dessus et bloquerait le bouton
  // "J'ai 18 ans ou plus — Entrer".
  const ageConfirmed = (() => {
    try { return !!window.localStorage.getItem('age_confirmed'); }
    catch { return false; }
  })();

  // Détecte si un Dialog/AlertDialog Radix est ouvert pour masquer le banner
  // cookies et éviter tout conflit visuel ou d'interaction.
  useEffect(() => {
    const checkDialogs = () => {
      const hasOpenDialog = !!document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );
      setOtherDialogOpen(hasOpenDialog);
    };
    checkDialogs();
    const observer = new MutationObserver(checkDialogs);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
    return () => observer.disconnect();
  }, []);

  if (hasConsented && !isSettingsOpen) return null;
  if (!ageConfirmed && !isSettingsOpen) return null;
  if (otherDialogOpen && !isSettingsOpen) return null;

  return (
    <AnimatePresence>
      {(!hasConsented || isSettingsOpen) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 p-3 pb-safe"
        >
          <div className="max-w-lg mx-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Gestion des cookies</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et afficher des publicités pertinentes. Conformément au RGPD, vous pouvez personnaliser vos choix.
              </p>
            </div>

            {/* Settings panel */}
            {isSettingsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-4 pb-2 space-y-2"
              >
                {/* Necessary - always on */}
                <CookieToggle
                  icon={<Shield className="w-3.5 h-3.5" />}
                  label="Essentiels"
                  description="Nécessaires au fonctionnement du site"
                  checked={true}
                  disabled
                />
                {/* Analytics */}
                <CookieToggle
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                  label="Analytiques"
                  description="Mesure d'audience et amélioration du site"
                  checked={analyticsChecked}
                  onChange={setAnalyticsChecked}
                />
                {/* Advertising */}
                <CookieToggle
                  icon={<Megaphone className="w-3.5 h-3.5" />}
                  label="Publicitaires"
                  description="Affichage de publicités personnalisées"
                  checked={advertisingChecked}
                  onChange={setAdvertisingChecked}
                />
              </motion.div>
            )}

            {/* Actions */}
            <div className="p-4 pt-2 flex flex-col gap-2">
              {isSettingsOpen ? (
                <div className="flex gap-2">
                  <button
                    onClick={closeSettings}
                    className="flex-1 px-3 py-2.5 text-xs font-medium rounded-xl border border-border/60 text-muted-foreground hover:bg-secondary/60 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => savePreferences({ analytics: analyticsChecked, advertising: advertisingChecked })}
                    className="flex-1 px-3 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Enregistrer mes choix
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={rejectAll}
                      className="flex-1 px-3 py-2.5 text-xs font-medium rounded-xl border border-border/60 text-muted-foreground hover:bg-secondary/60 transition-colors"
                    >
                      Tout refuser
                    </button>
                    <button
                      onClick={acceptAll}
                      className="flex-1 px-3 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Tout accepter
                    </button>
                  </div>
                  <button
                    onClick={openSettings}
                    className="w-full px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    Personnaliser mes choix
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>

            {/* Legal links */}
            <div className="px-4 pb-3 flex justify-center gap-3">
              <a href="/politique-confidentialite" className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground underline transition-colors">
                Politique de confidentialité
              </a>
              <a href="/mentions-legales" className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground underline transition-colors">
                Mentions légales
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface CookieToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (val: boolean) => void;
}

const CookieToggle = ({ icon, label, description, checked, disabled, onChange }: CookieToggleProps) => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border/30">
    <div className="text-muted-foreground">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
    </div>
    <button
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0",
        checked ? "bg-primary" : "bg-muted-foreground/30",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-4"
        )}
      />
    </button>
  </div>
);

export default CookieConsentBanner;
