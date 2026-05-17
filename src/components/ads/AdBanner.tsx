import { memo, useEffect, useRef, useState } from 'react';
import { ExternalLink, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAds, useAdClick } from '@/hooks/useAds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { cn } from '@/lib/utils';

interface AdBannerProps {
  placement?: 'compact' | 'native' | 'sponsored_card';
  className?: string;
  /** Index to pick from fetched ads (for multiple placements on same page) */
  index?: number;
}

const AdBanner = ({ placement = 'native', className, index = 0 }: AdBannerProps) => {
  const { currentAd, isAdFree, rotationIndex, getAdByOffset } = useAds(placement);
  const handleClick = useAdClick();
  const { user } = useAuth();
  const { preferences, hasConsented } = useCookieConsent();
  const [dismissed, setDismissed] = useState(false);
  const impressionTracked = useRef(new Set<string>());

  // Always use offset-based pick so multiple banners on the same page show DISTINCT ads
  const ad = getAdByOffset(index);

  // Track impression
  useEffect(() => {
    if (!ad?.id || !user?.id || impressionTracked.current.has(ad.id)) return;
    impressionTracked.current.add(ad.id);
    const track = async () => {
      try {
        await supabase.from('ad_impressions').insert({
          ad_id: ad.id,
          user_id: user.id,
          page_url: window.location.pathname,
        } as any);
        await supabase.rpc('increment_ad_impressions' as any, { _ad_id: ad.id });
      } catch {}
    };
    track();
  }, [ad?.id, user?.id]);

  // Reset dismissed on rotation
  useEffect(() => { setDismissed(false); }, [rotationIndex]);

  // Don't show ads if user hasn't consented to advertising cookies
  if (!hasConsented || !preferences.advertising) return null;
  if (isAdFree || !ad || dismissed) return null;

  if (placement === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 overflow-hidden",
          className
        )}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary/80 text-muted-foreground/50 hover:text-muted-foreground transition-colors z-10"
          aria-label="Masquer"
        >
          <X className="w-3 h-3" />
        </button>
        <button
          onClick={() => handleClick(ad.id, ad.link_url)}
          className="flex items-center gap-3 w-full text-left"
        >
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{ad.description}</p>
            )}
          </div>
          {ad.link_url && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
        </button>
        <SponsoredLabel />
      </motion.div>
    );
  }

  if (placement === 'sponsored_card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "group relative rounded-3xl bg-card overflow-hidden",
          "border border-border/30 shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.08)]",
          "hover:shadow-[0_8px_32px_-6px_hsl(var(--primary)/0.18)] hover:border-primary/30",
          "transition-all duration-500",
          className
        )}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-background/70 backdrop-blur-md hover:bg-background/90 text-muted-foreground/70 hover:text-foreground transition-all flex items-center justify-center"
          aria-label="Masquer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Sponsored badge floating */}
        <span className="absolute top-2.5 left-2.5 z-20 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/80 bg-background/70 backdrop-blur-md px-2 py-1 rounded-full">
          <Info className="w-2.5 h-2.5" />
          Sponsorisé
        </span>

        <button
          onClick={() => handleClick(ad.id, ad.link_url)}
          className="w-full text-left block"
        >
          {ad.image_url && (
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />
              {/* Gradient overlay for text legibility on bottom */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
              {/* Title overlay on image (Instagram-style) */}
              <div className="absolute inset-x-0 bottom-0 p-3.5 space-y-1">
                <p className="text-[11px] font-medium text-white/80 truncate">
                  {ad.advertiser_name}
                </p>
                <p className="text-base font-bold text-white leading-tight line-clamp-2 drop-shadow-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {ad.title}
                </p>
              </div>
            </div>
          )}

          <div className="p-3.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {ad.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {ad.description}
                </p>
              )}
            </div>
            {ad.link_url && (
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-gradient-to-r from-primary to-primary/85 px-4 py-2 rounded-full shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all">
                Découvrir
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </button>
      </motion.div>
    );
  }

  // Default: native
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-xl border border-border/30 bg-gradient-to-r from-card via-card to-secondary/20 p-3.5 overflow-hidden",
        className
      )}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary/80 text-muted-foreground/40 hover:text-muted-foreground transition-colors z-10"
        aria-label="Masquer"
      >
        <X className="w-3 h-3" />
      </button>
      <button
        onClick={() => handleClick(ad.id, ad.link_url)}
        className="flex items-start gap-3 w-full text-left"
      >
        {ad.image_url && (
          <img
            src={ad.image_url}
            alt=""
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{ad.title}</p>
          {ad.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ad.description}</p>
          )}
          <div className="flex items-center justify-between">
            <SponsoredLabel />
            {ad.link_url && (
              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                Découvrir <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
};

const SponsoredLabel = () => (
  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 font-medium">
    <Info className="w-2.5 h-2.5" />
    Sponsorisé
  </span>
);

export default memo(AdBanner);
