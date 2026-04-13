import { useState } from 'react';
import { ShoppingCart, Gift, BarChart3, Coins, Sparkles, Heart, TrendingUp } from 'lucide-react';
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
      className="relative overflow-hidden rounded-2xl border border-primary/20"
      style={{
        background: 'linear-gradient(145deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08), hsl(var(--primary) / 0.04))',
      }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -inset-x-full top-0 h-full w-[200%]"
          style={{
            background: 'linear-gradient(90deg, transparent 30%, hsl(var(--primary) / 0.08) 50%, transparent 70%)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
      </div>

      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-accent/5 blur-xl" />

      <div className="relative p-6">
        {/* Label */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 font-heading">
            <Coins className="w-3.5 h-3.5 text-primary" />
            Solde disponible
            {isCouple && (
              <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 text-[10px] font-bold border border-pink-500/20">
                <Heart className="w-2.5 h-2.5 fill-current" />
                Partagé
              </span>
            )}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
            <TrendingUp className="w-3 h-3" />
            Actif
          </div>
        </div>

        {/* Big balance */}
        <div className="flex items-baseline gap-2.5 mb-1.5">
          <motion.span
            key={totalCredits}
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-5xl font-heading font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
          >
            {totalCredits.toFixed(1)}
          </motion.span>
          <span className="text-sm text-muted-foreground font-medium">crédits</span>
        </div>

        <p className="text-[11px] text-muted-foreground/60 mb-6 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary/60" />
          Utilisables immédiatement
        </p>

        {/* 3 Action buttons */}
        <div className="flex gap-2.5">
          <BuyCreditDialog
            trigger={
              <Button
                size="sm"
                className="flex-1 gap-1.5 h-11 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Acheter
              </Button>
            }
          />
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 h-11 text-xs font-semibold rounded-xl border-border/60 bg-card/50 backdrop-blur-sm hover:bg-card/80"
            onClick={onOpenGift}
          >
            <Gift className="w-3.5 h-3.5 text-pink-500" />
            Offrir
          </Button>
          <CreditHistorySheet
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 h-11 text-xs font-semibold rounded-xl border-border/60 bg-card/50 backdrop-blur-sm hover:bg-card/80"
              >
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
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
