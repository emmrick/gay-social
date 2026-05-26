import { Zap, Settings2, Hand, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanNowSession, usePlanNowCountdown } from '@/hooks/usePlanNowSession';
import { usePlanNowManualOverride } from '@/hooks/usePlanNowManualOverride';
import { useState } from 'react';
import PlanNowSettingsSheet from './PlanNowSettingsSheet';

interface Props {
  /** Other participant's user id — used to scope manual override per conversation. */
  otherUserId?: string;
}

/**
 * Bandeau affiché dans la messagerie privée quand l'utilisateur a une session
 * Plan Now active. Permet d'éditer les réponses auto ou de reprendre la main
 * (manual_override) sur cette conversation en particulier.
 */
const PlanNowComposerBanner = ({ otherUserId }: Props) => {
  const { activeSession, isActive } = usePlanNowSession();
  const { label } = usePlanNowCountdown(activeSession?.expires_at);
  const { hasOverride, enableOverride, disableOverride, isMutating } =
    usePlanNowManualOverride(otherUserId);
  const [open, setOpen] = useState(false);

  if (!isActive) return null;

  return (
    <>
      <div
        className={cn(
          'mx-3 mt-2 mb-1 px-3 py-2 rounded-xl flex items-center gap-2',
          hasOverride
            ? 'bg-muted/60 border border-border/60'
            : 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30',
        )}
      >
        <Zap
          className={cn(
            'w-3.5 h-3.5 flex-shrink-0 fill-current',
            hasOverride ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400',
          )}
        />
        <p className="text-[12px] flex-1 text-foreground/90 leading-tight">
          <span className="font-semibold">Plan Now actif</span>
          <span className="text-muted-foreground">
            {' · '}
            {hasOverride ? 'réponses manuelles ici' : 'auto-réponses'}
            {' · '}
            {label}
          </span>
        </p>

        {hasOverride ? (
          <button
            type="button"
            onClick={() => disableOverride()}
            disabled={isMutating}
            className="text-[11px] font-semibold text-foreground hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Réactiver
          </button>
        ) : (
          <>
            {otherUserId && (
              <button
                type="button"
                onClick={() => enableOverride()}
                disabled={isMutating}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
              >
                <Hand className="w-3 h-3" />
                Reprendre
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              Éditer
            </button>
          </>
        )}
      </div>
      <PlanNowSettingsSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default PlanNowComposerBanner;
