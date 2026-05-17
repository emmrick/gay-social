import { motion } from 'framer-motion';
import { ExternalLink, X, Info, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAds, useAdClick } from '@/hooks/useAds';
import { useAuth } from '@/contexts/AuthContext';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { supabase } from '@/integrations/supabase/client';

interface SwipeAdInterstitialProps {
  onContinue: () => void;
}

/**
 * Square sponsored card that takes the place of a swipe card every 5 profiles.
 * Falls back to a graceful "passez à la suite" card if no ad is available.
 */
const SwipeAdInterstitial = ({ onContinue }: SwipeAdInterstitialProps) => {
  const { currentAd, isAdFree } = useAds('sponsored_card');
  const { preferences, hasConsented } = useCookieConsent();
  const { user } = useAuth();
  const handleClick = useAdClick();
  const tracked = useRef<string | null>(null);

  const adsAllowed = hasConsented && preferences.advertising;
  const ad = adsAllowed && !isAdFree ? currentAd : null;

  useEffect(() => {
    if (!ad?.id || !user?.id || tracked.current === ad.id) return;
    tracked.current = ad.id;
    (async () => {
      try {
        await supabase.from('ad_impressions').insert({
          ad_id: ad.id,
          user_id: user.id,
          page_url: window.location.pathname,
          placement: 'swipe_interstitial',
        } as any);
        await supabase.rpc('increment_ad_impressions' as any, { _ad_id: ad.id });
      } catch {}
    })();
  }, [ad?.id, user?.id]);

  return (
    <div className="absolute inset-0 flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden border border-border/40 bg-card shadow-2xl shadow-primary/10"
      >
        {ad ? (
          <button
            onClick={() => handleClick(ad.id, ad.link_url)}
            className="block w-full h-full text-left group"
          >
            {ad.image_url && (
              <div className="relative w-full h-2/3 overflow-hidden">
                <img
                  src={ad.image_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/40">
                  <Info className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground">Sponsorisé</span>
                </div>
              </div>
            )}
            <div className="p-4 h-1/3 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground leading-tight line-clamp-1">
                  {ad.title}
                </p>
                {ad.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {ad.description}
                  </p>
                )}
              </div>
              {ad.link_url && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    Découvrir <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          </button>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
              Continue ta découverte
            </p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Encore plus de profils t'attendent juste après !
            </p>
          </div>
        )}

        {/* Continue button overlay */}
        <button
          onClick={onContinue}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform z-10"
        >
          Suivant
          <X className="w-3 h-3 rotate-45" />
        </button>
      </motion.div>
    </div>
  );
};

export default SwipeAdInterstitial;
