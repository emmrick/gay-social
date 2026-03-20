import { memo, useEffect, useRef } from 'react';
import { ExternalLink, X, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAds, useAdClick } from '@/hooks/useAds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AdBannerProps {
  placement?: 'compact' | 'native' | 'sponsored_card';
  className?: string;
  /** Index to pick from fetched ads (for multiple placements on same page) */
  index?: number;
}

const AdBanner = ({ placement = 'native', className, index = 0 }: AdBannerProps) => {
  const { ads, isAdFree } = useAds(placement, 5);
  const handleClick = useAdClick();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const impressionTracked = useRef(new Set<string>());

  const ad = ads?.[index % (ads?.length || 1)];

  // Track impression
  useEffect(() => {
    if (!ad?.id || !user?.id || impressionTracked.current.has(ad.id)) return;
    impressionTracked.current.add(ad.id);
    const track = async () => {
      await supabase.from('ad_impressions').insert({
        ad_id: ad.id,
        user_id: user.id,
        page_url: window.location.pathname,
      } as any);
    };
    track().catch(() => {});
  }, [ad?.id, user?.id]);

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm",
          className
        )}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 p-1 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground/60 hover:text-muted-foreground transition-colors z-10"
          aria-label="Masquer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleClick(ad.id, ad.link_url)}
          className="w-full text-left"
        >
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt=""
              className="w-full h-36 object-cover"
              loading="lazy"
            />
          )}
          <div className="p-3.5 space-y-1.5">
            <p className="text-sm font-semibold text-foreground leading-tight">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ad.description}</p>
            )}
            <div className="flex items-center justify-between pt-1">
              <SponsoredLabel />
              {ad.link_url && (
                <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                  En savoir plus <ExternalLink className="w-3 h-3" />
                </span>
              )}
            </div>
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
