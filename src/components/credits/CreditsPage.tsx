import { useState } from 'react';
import { Loader2, AlertTriangle, Timer, BanIcon, Sparkles, Zap } from 'lucide-react';
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
import { useAdFreeStatus } from '@/hooks/useAds';
import { motion } from 'framer-motion';

const CreditsPage = () => {
  const { isLoading } = useCredits();
  const { data: dynamicCosts } = useDynamicCreditCosts();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showAdFreeDialog, setShowAdFreeDialog] = useState(false);
  const { data: isAdFree } = useAdFreeStatus();

  // Passive recharge promo detection
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
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">Crédits</h1>
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
            className="relative overflow-hidden rounded-xl border border-orange-500/25 p-3.5"
            style={{
              background: 'linear-gradient(135deg, hsl(25 95% 53% / 0.08), hsl(35 95% 53% / 0.04))',
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -inset-x-full top-0 h-full w-[200%]"
                style={{
                  background: 'linear-gradient(90deg, transparent 40%, hsl(25 95% 53% / 0.08) 50%, transparent 60%)',
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              />
            </div>
            <div className="relative flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  🔥 Recharge passive boostée !
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  +{currentAmount} crédit{currentAmount > 1 ? 's' : ''} toutes les <strong className="text-foreground">{currentInterval}h</strong>
                  {currentInterval < defaultInterval && (
                    <span className="line-through ml-1 opacity-60">{defaultInterval}h</span>
                  )}
                  {currentAmount > defaultAmount && (
                    <span className="ml-1">
                      (au lieu de {defaultAmount})
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-orange-500/80 mt-1 font-medium">
                  Profitez-en, durée limitée !
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credit Breakdown */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Répartition
          </p>
          <CreditBreakdownCards />
        </section>

        {/* Priority order hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/40"
        >
          <span className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Ordre d'utilisation :</span>{' '}
            Quotidien → Passif → Bonus → Achetés
          </span>
        </motion.div>

        {/* Launch promo */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3.5">
          <Timer className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Prix de lancement</p>
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
            className="w-full flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-left hover:bg-primary/10 transition-colors active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <BanIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Naviguer sans publicité</p>
              <p className="text-[11px] text-muted-foreground">À partir de 7 crédits/semaine</p>
            </div>
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          </motion.button>
        )}

        {isAdFree && (
          <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-700 dark:text-green-400">
            <BanIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Abonnement sans pub actif</span>
          </div>
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
            className="gap-1.5 text-xs text-destructive border-destructive/20 hover:bg-destructive/5"
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
