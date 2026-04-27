import { ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdPreviewProps {
  placement: 'compact' | 'native' | 'sponsored_card';
  title: string;
  description?: string;
  imageUrl?: string;
  hasLink?: boolean;
  className?: string;
}

const SponsoredLabel = () => (
  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 font-medium">
    <Info className="w-2.5 h-2.5" />
    Sponsorisé
  </span>
);

/**
 * Live preview of how an ad will look in each placement format.
 * Mirrors AdBanner.tsx exactly so what the advertiser sees == what users see.
 */
export const AdPreview = ({ placement, title, description, imageUrl, hasLink = true, className }: AdPreviewProps) => {
  const safeTitle = title?.trim() || 'Titre de votre annonce';
  const safeDesc = description?.trim();

  if (placement === 'compact') {
    return (
      <div className={cn('relative rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 overflow-hidden', className)}>
        <div className="flex items-center gap-3 w-full text-left">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{safeTitle}</p>
            {safeDesc && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{safeDesc}</p>}
          </div>
          {hasLink && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
        </div>
        <SponsoredLabel />
      </div>
    );
  }

  if (placement === 'sponsored_card') {
    return (
      <div className={cn('relative rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm', className)}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-gradient-to-br from-muted via-muted/50 to-muted" />
        )}
        <div className="p-3.5 space-y-1.5">
          <p className="text-sm font-semibold text-foreground leading-tight">{safeTitle}</p>
          {safeDesc && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{safeDesc}</p>}
          <div className="flex items-center justify-between pt-1">
            <SponsoredLabel />
            {hasLink && (
              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                En savoir plus <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // native
  return (
    <div className={cn('relative rounded-xl border border-border/30 bg-gradient-to-r from-card via-card to-secondary/20 p-3.5 overflow-hidden', className)}>
      <div className="flex items-start gap-3 w-full text-left">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{safeTitle}</p>
          {safeDesc && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{safeDesc}</p>}
          <div className="flex items-center justify-between">
            <SponsoredLabel />
            {hasLink && (
              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                Découvrir <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const placementLabel: Record<string, string> = {
  compact: 'Bandeau compact',
  native: 'Natif (flux)',
  sponsored_card: 'Carte sponsorisée',
};

interface AdPreviewGridProps {
  selectedPlacements: ('compact' | 'native' | 'sponsored_card')[];
  title: string;
  description?: string;
  imageUrl?: string;
  hasLink?: boolean;
}

export const AdPreviewGrid = ({ selectedPlacements, title, description, imageUrl, hasLink }: AdPreviewGridProps) => {
  if (selectedPlacements.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic text-center py-4">
        Sélectionnez au moins un format pour voir l'aperçu.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {selectedPlacements.map((p) => (
        <div key={p} className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{placementLabel[p]}</p>
          <AdPreview placement={p} title={title} description={description} imageUrl={imageUrl} hasLink={hasLink} />
        </div>
      ))}
    </div>
  );
};
