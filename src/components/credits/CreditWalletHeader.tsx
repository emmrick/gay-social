import { useState } from 'react';
import { ShoppingCart, Gift, BarChart3, Coins, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { motion } from 'framer-motion';
import BuyCreditDialog from './BuyCreditDialog';
import CreditHistorySheet from './CreditHistorySheet';
import { cn } from '@/lib/utils';

interface CreditWalletHeaderProps {
  onOpenGift: () => void;
}

const CreditWalletHeader = ({ onOpenGift }: CreditWalletHeaderProps) => {
  const { totalCredits, availableCredits, isLoading } = useCredits();
  const { isCouple, partnerProfile } = useActiveProfile();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-32 mb-2" />
        <div className="h-12 bg-muted rounded w-48 mb-4" />
        <div className="flex gap-2">
          <div className="h-10 bg-muted rounded flex-1" />
          <div className="h-10 bg-muted rounded flex-1" />
          <div className="h-10 bg-muted rounded flex-1" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-primary/15"
      style={{
        background: 'linear-gradient(145deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.04))',
      }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -inset-x-full top-0 h-full w-[200%]"
          style={{
            background: 'linear-gradient(90deg, transparent 40%, hsl(var(--primary) / 0.06) 50%, transparent 60%)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
        />
      </div>

      <div className="relative p-5">
        {/* Balance */}
        <div className="mb-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            Solde disponible
            {isCouple && (
              <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-semibold border border-pink-500/20">
                <Heart className="w-2.5 h-2.5 fill-current" />
                Partagé
              </span>
            )}
          </p>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <motion.span
            key={totalCredits}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold tracking-tight"
          >
            {totalCredits.toFixed(1)}
          </motion.span>
          <span className="text-sm text-muted-foreground font-medium">crédits</span>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mb-5 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Utilisables immédiatement
        </p>

        {/* 3 Actions */}
        <div className="flex gap-2">
          <BuyCreditDialog
            trigger={
              <Button size="sm" className="flex-1 gap-1.5 h-10 text-xs font-semibold rounded-xl">
                <ShoppingCart className="w-3.5 h-3.5" />
                Acheter
              </Button>
            }
          />
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 h-10 text-xs font-semibold rounded-xl"
            onClick={onOpenGift}
          >
            <Gift className="w-3.5 h-3.5" />
            Offrir
          </Button>
          <CreditHistorySheet
            trigger={
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-10 text-xs font-semibold rounded-xl">
                <BarChart3 className="w-3.5 h-3.5" />
                Historique
              </Button>
            }
          />
        </div>
      </div>
    </motion.div>
  );
};

export default CreditWalletHeader;
