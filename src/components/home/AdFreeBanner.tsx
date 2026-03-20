import { useState } from 'react';
import { BanIcon, HelpCircle, X } from 'lucide-react';

const STORAGE_KEY = 'gc_ad_free_banner';

interface BannerState {
  dismissedAt: number;
  dismissCount: number;
  firstSeen: number;
}

const getBannerState = (): BannerState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const shouldShow = (): boolean => {
  const state = getBannerState();
  if (!state) return true; // Never dismissed

  const now = Date.now();
  const daysSinceFirstSeen = (now - state.firstSeen) / (1000 * 60 * 60 * 24);
  const daysSinceDismissed = (now - state.dismissedAt) / (1000 * 60 * 60 * 24);

  // First 3 months (~90 days): show every 2 weeks (14 days)
  // After 3 months: show every month (30 days)
  const interval = daysSinceFirstSeen < 90 ? 14 : 30;

  return daysSinceDismissed >= interval;
};

const AdFreeBanner = () => {
  const [visible, setVisible] = useState(() => shouldShow());

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      const prev = getBannerState();
      const state: BannerState = {
        dismissedAt: Date.now(),
        dismissCount: (prev?.dismissCount ?? 0) + 1,
        firstSeen: prev?.firstSeen ?? Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  };

  return (
    <div className="relative rounded-xl border border-border/50 bg-gradient-to-r from-secondary/60 via-background to-secondary/60 p-4 space-y-2">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2.5 pr-6">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <BanIcon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            🤝 Publicités respectueuses
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-[46px]">
        Nous ne diffusons que des <span className="font-medium text-foreground">annonces discrètes et vérifiées</span>, sans pop-up ni vidéo invasive. 
        Votre expérience reste notre priorité. L'économie du site repose sur les <span className="font-medium text-foreground">crédits</span> et des partenariats sélectionnés.
      </p>
      <a
        href="/?tab=help"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline pl-[46px] pt-1"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Consultez la FAQ dédiée pour comprendre les crédits
      </a>
    </div>
  );
};

export default AdFreeBanner;
