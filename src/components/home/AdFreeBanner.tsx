import { useState } from 'react';
import { BanIcon, HelpCircle, X, Sparkles } from 'lucide-react';
import AdFreeSubscriptionDialog from '@/components/ads/AdFreeSubscriptionDialog';

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
  if (!state) return true;
  const now = Date.now();
  const daysSinceFirstSeen = (now - state.firstSeen) / (1000 * 60 * 60 * 24);
  const daysSinceDismissed = (now - state.dismissedAt) / (1000 * 60 * 60 * 24);
  const interval = daysSinceFirstSeen < 90 ? 14 : 30;
  return daysSinceDismissed >= interval;
};

const AdFreeBanner = () => {
  const [visible, setVisible] = useState(() => shouldShow());
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);

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
    <>
      <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-4 space-y-2">
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-muted/50 text-muted-foreground/40 hover:text-foreground transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5 pr-6">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
            <BanIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">
              🤝 Publicités respectueuses
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed pl-[46px]">
          Nous ne diffusons que des <span className="font-semibold text-foreground">annonces discrètes et vérifiées</span>, sans pop-up ni vidéo invasive.
        </p>
        <div className="flex items-center gap-3 pl-[46px] pt-1">
          <button
            onClick={() => setShowSubscribeDialog(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Naviguer sans pub
          </button>
          <a
            href="/?tab=help"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground hover:underline transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            En savoir plus
          </a>
        </div>
      </div>

      <AdFreeSubscriptionDialog
        open={showSubscribeDialog}
        onOpenChange={setShowSubscribeDialog}
      />
    </>
  );
};

export default AdFreeBanner;
