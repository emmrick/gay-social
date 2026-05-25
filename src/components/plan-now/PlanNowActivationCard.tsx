import { motion } from 'framer-motion';
import { Zap, Coins, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePlanNowSession, usePlanNowCountdown } from '@/hooks/usePlanNowSession';
import { cn } from '@/lib/utils';

/**
 * Carte d'activation Plan Now affichée dans le profil de l'utilisateur.
 * - Si pas actif : CTA pour ouvrir le sheet d'activation (5 crédits / 30 min).
 * - Si actif : countdown live + bouton désactiver.
 */
const PlanNowActivationCard = () => {
  const { activeSession, isActive, activate, isActivating, cancel, isCancelling, cost, durationMinutes } =
    usePlanNowSession();
  const { label: countdown } = usePlanNowCountdown(activeSession?.expires_at);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22 }}
          className={cn(
            'w-full rounded-2xl border p-4 text-left transition-all group',
            isActive
              ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-500/20 border-amber-500/40 shadow-md shadow-amber-500/10'
              : 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/15 hover:from-amber-500/20 hover:to-amber-500/20 border-amber-500/20',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform',
                'bg-gradient-to-br from-amber-500 to-orange-500 group-hover:scale-110',
                isActive && 'animate-pulse',
              )}
            >
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm flex items-center gap-2">
                ⚡ Plan Now — Recherche Express
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <Clock className="w-3 h-3" />
                    {countdown}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isActive
                  ? 'Ton profil est mis en avant en ce moment.'
                  : (
                    <>
                      Sois mis en avant <span className="font-semibold text-amber-600 dark:text-amber-400">{durationMinutes} min</span> pour {cost} crédits
                    </>
                  )}
              </p>
            </div>
          </div>
        </motion.button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <span className="inline-flex w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-white fill-white" />
            </span>
            Plan Now — Recherche Express
          </SheetTitle>
          <SheetDescription>
            Signale aux autres utilisateurs que tu cherches une rencontre <strong>maintenant</strong>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/50 p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Durée</p>
              <p className="text-sm font-bold">{durationMinutes} min</p>
            </div>
            <div className="rounded-xl border border-border/50 p-3 text-center">
              <Coins className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût</p>
              <p className="text-sm font-bold">{cost} crédits</p>
            </div>
            <div className="rounded-xl border border-border/50 p-3 text-center">
              <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Effet</p>
              <p className="text-sm font-bold">Priorité</p>
            </div>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-amber-500">⚡</span><span>Badge "Plan Now" visible sur ton profil et tes cartes.</span></li>
            <li className="flex gap-2"><span className="text-amber-500">🚀</span><span>Tu apparais en priorité dans les profils proches.</span></li>
            <li className="flex gap-2"><span className="text-amber-500">🤖</span><span>Auto-réponses configurables aux questions fréquentes <em>(bientôt)</em>.</span></li>
            <li className="flex gap-2"><span className="text-amber-500">🔒</span><span>Échange d'albums sécurisé entre profils Plan Now <em>(bientôt)</em>.</span></li>
          </ul>

          {isActive ? (
            <div className="space-y-3 pt-2">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Temps restant</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{countdown}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => cancel()}
                disabled={isCancelling}
              >
                {isCancelling ? 'Désactivation...' : 'Désactiver Plan Now'}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Les crédits dépensés ne sont pas remboursés.
              </p>
            </div>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
              size="lg"
              onClick={() => activate()}
              disabled={isActivating}
            >
              <Zap className="w-4 h-4 mr-2 fill-white" />
              {isActivating ? 'Activation...' : `Activer pour ${cost} crédits`}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PlanNowActivationCard;
