import { useState } from 'react';
import { Loader2, AlertTriangle, Timer, BanIcon, Sparkles, Zap, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { useDynamicCreditCosts, DEFAULT_COSTS } from '@/hooks/useDynamicCreditCosts';
import CreditWalletHeader from './CreditWalletHeader';
import { toast } from 'sonner';
import CreditBreakdownCards from './CreditBreakdownCards';
import CreditMissionsSection from './CreditMissionsSection';
import CreditCostsAccordion from './CreditCostsAccordion';
import CreditFAQSection from './CreditFAQSection';
import SendGiftSection from './SendGiftSection';
import ContactCreditIssueDialog from './ContactCreditIssueDialog';
import AdBanner from '@/components/ads/AdBanner';
import AdFreeSubscriptionDialog from '@/components/ads/AdFreeSubscriptionDialog';
import { useAdFreeStatus, useAdFreeSubscription } from '@/hooks/useAds';
import { motion } from 'framer-motion';

const CreditsPage = () => {
  const { isLoading } = useCredits();
  const { data: dynamicCosts } = useDynamicCreditCosts();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showAdFreeDialog, setShowAdFreeDialog] = useState(false);
  const { data: isAdFree } = useAdFreeStatus();
  const { data: adFreeSub } = useAdFreeSubscription();

  const currentInterval = dynamicCosts?.passive_recharge_interval_hours ?? DEFAULT_COSTS.passive_recharge_interval_hours;
  const currentAmount = dynamicCosts?.passive_recharge_amount ?? DEFAULT_COSTS.passive_recharge_amount;
  const defaultInterval = DEFAULT_COSTS.passive_recharge_interval_hours;
  const defaultAmount = DEFAULT_COSTS.passive_recharge_amount;
  const isPassivePromo = currentInterval < defaultInterval || currentAmount > defaultAmount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background pb-24">
      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tight">Crédits</h1>
            <p className="text-xs text-muted-foreground">Gérez et rechargez vos crédits</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Wallet Header */}
        <CreditWalletHeader onOpenGift={() => {
          toast.info('🎁 Pour offrir des crédits', {
            description: 'Ouvrez une conversation privée et utilisez le bouton cadeau 🎁 dans la barre de saisie.',
            duration: 4000,
          });
        }} />


        {/* Passive recharge promo banner */}
        {isPassivePromo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-orange-500/20 p-4"
            style={{
              background: 'linear-gradient(135deg, hsl(25 95% 53% / 0.06), hsl(35 95% 53% / 0.03))',
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -inset-x-full top-0 h-full w-[200%]"
                style={{
                  background: 'linear-gradient(90deg, transparent 40%, hsl(25 95% 53% / 0.06) 50%, transparent 60%)',
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              />
            </div>
            <div className="relative flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 font-heading">
                  🔥 Recharge passive boostée !
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  +{currentAmount} crédit{currentAmount > 1 ? 's' : ''} toutes les <strong className="text-foreground">{currentInterval}h</strong>
                  {currentInterval < defaultInterval && (
                    <span className="line-through ml-1 opacity-50">{defaultInterval}h</span>
                  )}
                  {currentAmount > defaultAmount && (
                    <span className="ml-1">(au lieu de {defaultAmount})</span>
                  )}
                </p>
                <p className="text-[10px] text-orange-500/70 mt-1 font-semibold">
                  Profitez-en, durée limitée !
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credit Breakdown */}
        <section>
          <p className="text-[11px] font-heading font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Répartition
          </p>
          <CreditBreakdownCards />
        </section>

        {/* Priority order hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40"
        >
          <span className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Ordre d'utilisation :</span>{' '}
            Quotidien → Passif → Bonus → Achetés
          </span>
        </motion.div>

        {/* Launch promo */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Timer className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-heading">Prix de lancement</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Tarifs temporaires, valables 1 an après l'ouverture. Les prix définitifs seront plus élevés.
            </p>
          </div>
        </div>

        {/* Gift section */}
        <SendGiftSection />

        {/* Missions */}
        <CreditMissionsSection />

        {/* Ad-free option */}
        {!isAdFree && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            onClick={() => setShowAdFreeDialog(true)}
            className="w-full flex items-center gap-3.5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-left hover:bg-primary/8 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BanIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground font-heading">Naviguer sans publicité</p>
              <p className="text-[11px] text-muted-foreground">À partir de 7 crédits/semaine</p>
            </div>
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          </motion.button>
        )}

        {isAdFree && adFreeSub?.isActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <BanIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-heading">
                  Sans pub actif
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {adFreeSub.daysRemaining > 0
                    ? `Encore ${adFreeSub.daysRemaining} jour${adFreeSub.daysRemaining > 1 ? 's' : ''}${adFreeSub.hoursRemaining > 0 ? ` et ${adFreeSub.hoursRemaining}h` : ''}`
                    : `Encore ${adFreeSub.hoursRemaining}h`}
                  {' · '}
                  Expire le {adFreeSub.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Progress bar — visual countdown */}
            {adFreeSub.startsAt && (
              <div className="space-y-1.5">
                {(() => {
                  const total = adFreeSub.expiresAt.getTime() - adFreeSub.startsAt.getTime();
                  const elapsed = Date.now() - adFreeSub.startsAt.getTime();
                  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                  return (
                    <>
                      <div className="h-1.5 rounded-full bg-emerald-500/15 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{adFreeSub.startsAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        <span>{Math.round(100 - pct)}% restant</span>
                        <span>{adFreeSub.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Renew CTA */}
            <Button
              onClick={() => setShowAdFreeDialog(true)}
              size="sm"
              variant="outline"
              className="w-full border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Prolonger à l'avance
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Renouvelez maintenant pour ajouter du temps à votre période actuelle.
            </p>
          </motion.div>
        )}

        {/* Ad */}
        <AdBanner placement="compact" />

        {/* Costs */}
        <CreditCostsAccordion />

        {/* Claim button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-destructive border-destructive/20 hover:bg-destructive/5 rounded-xl"
            onClick={() => setShowClaimDialog(true)}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Réclamer des crédits
          </Button>
        </div>

        <ContactCreditIssueDialog
          open={showClaimDialog}
          onOpenChange={setShowClaimDialog}
        />

        <AdFreeSubscriptionDialog
          open={showAdFreeDialog}
          onOpenChange={setShowAdFreeDialog}
        />

        {/* FAQ */}
        <CreditFAQSection />
      </div>
    </div>
  );
};

export default CreditsPage;
