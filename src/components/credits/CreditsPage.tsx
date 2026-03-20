import { useState } from 'react';
import { Loader2, AlertTriangle, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import CreditWalletHeader from './CreditWalletHeader';
import { toast } from 'sonner';
import CreditBreakdownCards from './CreditBreakdownCards';
import CreditMissionsSection from './CreditMissionsSection';
import CreditCostsAccordion from './CreditCostsAccordion';
import CreditFAQSection from './CreditFAQSection';
import SendGiftSection from './SendGiftSection';
import ContactCreditIssueDialog from './ContactCreditIssueDialog';
import { motion } from 'framer-motion';

const CreditsPage = () => {
  const { isLoading } = useCredits();
  const [showClaimDialog, setShowClaimDialog] = useState(false);

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

        {/* FAQ */}
        <CreditFAQSection />
      </div>
    </div>
  );
};

export default CreditsPage;
