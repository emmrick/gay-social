import { Clock, Zap, Star, ShoppingBag, Lock, Unlock, Info } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CreditBreakdownCards = () => {
  const {
    dailyCredits, maxDailyCredits,
    passiveCredits, bonusCredits, purchasedCredits,
    lockPassive, lockBonus, lockPurchased,
    toggleCreditLock, isLoading,
  } = useCredits();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Quotidien',
      value: dailyCredits,
      max: maxDailyCredits,
      icon: Clock,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/8',
      barColor: 'bg-emerald-500',
      borderColor: 'border-emerald-500/15',
      hint: 'Rechargé chaque jour à 5.0 max',
      lockable: false,
      progress: (dailyCredits / maxDailyCredits) * 100,
    },
    {
      label: 'Passif',
      value: passiveCredits,
      max: 10,
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/8',
      barColor: 'bg-amber-500',
      borderColor: 'border-amber-500/15',
      hint: '+0.1 toutes les 6h (max 10)',
      lockable: true,
      locked: lockPassive,
      lockKey: 'lock_passive' as const,
      progress: (passiveCredits / 10) * 100,
    },
    {
      label: 'Bonus',
      value: bonusCredits,
      icon: Star,
      color: 'text-blue-500',
      bg: 'bg-blue-500/8',
      barColor: 'bg-blue-500',
      borderColor: 'border-blue-500/15',
      hint: 'Inscription, vérification, parrainage',
      lockable: true,
      locked: lockBonus,
      lockKey: 'lock_bonus' as const,
    },
    {
      label: 'Achetés',
      value: purchasedCredits,
      icon: ShoppingBag,
      color: 'text-sky-500',
      bg: 'bg-sky-500/8',
      barColor: 'bg-sky-500',
      borderColor: 'border-sky-500/15',
      hint: 'N\'expirent jamais',
      lockable: true,
      locked: lockPurchased,
      lockKey: 'lock_purchased' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative rounded-xl border p-3.5 transition-all",
              card.bg, card.borderColor,
              card.locked && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", card.bg)}>
                <Icon className={cn("w-4 h-4", card.color)} />
              </div>
              {card.lockable && (
                <div className="flex items-center gap-1">
                  {card.locked ? (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Unlock className="w-3 h-3 text-muted-foreground" />
                  )}
                  <Switch
                    checked={!card.locked}
                    onCheckedChange={(checked) => toggleCreditLock(card.lockKey!, !checked)}
                    className="scale-[0.6]"
                  />
                </div>
              )}
            </div>

            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{card.label}</p>
            <p className="text-xl font-bold tabular-nums tracking-tight">
              {card.value.toFixed(1)}
              {card.max !== undefined && (
                <span className="text-xs text-muted-foreground font-normal">/{card.max}</span>
              )}
            </p>

            {/* Progress bar for daily & passive */}
            {card.progress !== undefined && (
              <div className="mt-2 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", card.barColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(card.progress, 100)}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
                />
              </div>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="absolute top-2 right-2 p-0.5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity">
                  <Info className="w-3 h-3 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-48">
                {card.hint}
              </TooltipContent>
            </Tooltip>
          </motion.div>
        );
      })}
    </div>
  );
};

export default CreditBreakdownCards;
