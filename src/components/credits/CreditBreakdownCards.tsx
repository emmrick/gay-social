import { Clock, Zap, Star, ShoppingBag, Lock, Unlock, Info, Flame } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useDynamicCreditCosts, DEFAULT_COSTS } from '@/hooks/useDynamicCreditCosts';
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
  const { data: dynamicCosts } = useDynamicCreditCosts();

  const currentInterval = dynamicCosts?.passive_recharge_interval_hours ?? DEFAULT_COSTS.passive_recharge_interval_hours;
  const currentAmount = dynamicCosts?.passive_recharge_amount ?? DEFAULT_COSTS.passive_recharge_amount;
  const currentMax = dynamicCosts?.passive_recharge_max ?? DEFAULT_COSTS.passive_recharge_max;
  const defaultInterval = DEFAULT_COSTS.passive_recharge_interval_hours;
  const defaultAmount = DEFAULT_COSTS.passive_recharge_amount;
  const isPassivePromo = currentInterval < defaultInterval || currentAmount > defaultAmount;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
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
      bgIcon: 'bg-emerald-500/10',
      barColor: 'bg-emerald-500',
      glowColor: 'shadow-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      hint: 'Rechargé chaque jour à 5.0 max',
      lockable: false,
      progress: (dailyCredits / maxDailyCredits) * 100,
    },
    {
      label: 'Passif',
      value: passiveCredits,
      max: currentMax,
      icon: Zap,
      color: isPassivePromo ? 'text-orange-500' : 'text-amber-500',
      bgIcon: isPassivePromo ? 'bg-orange-500/10' : 'bg-amber-500/10',
      barColor: isPassivePromo ? 'bg-orange-500' : 'bg-amber-500',
      glowColor: isPassivePromo ? 'shadow-orange-500/10' : 'shadow-amber-500/10',
      borderColor: isPassivePromo ? 'border-orange-500/25' : 'border-amber-500/20',
      hint: `+${currentAmount} toutes les ${currentInterval}h (max ${currentMax})`,
      lockable: true,
      locked: lockPassive,
      lockKey: 'lock_passive' as const,
      progress: (passiveCredits / currentMax) * 100,
      promo: isPassivePromo,
    },
    {
      label: 'Bonus',
      value: bonusCredits,
      icon: Star,
      color: 'text-blue-500',
      bgIcon: 'bg-blue-500/10',
      barColor: 'bg-blue-500',
      glowColor: 'shadow-blue-500/10',
      borderColor: 'border-blue-500/20',
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
      bgIcon: 'bg-sky-500/10',
      barColor: 'bg-sky-500',
      glowColor: 'shadow-sky-500/10',
      borderColor: 'border-sky-500/20',
      hint: "N'expirent jamais",
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
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative rounded-2xl border p-4 transition-all bg-card/80 backdrop-blur-sm",
              card.borderColor,
              card.glowColor,
              card.locked && "opacity-50 grayscale-[30%]"
            )}
          >
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.bgIcon)}>
                <Icon className={cn("w-4.5 h-4.5", card.color)} />
              </div>
              {card.lockable && (
                <div className="flex items-center gap-1">
                  {card.locked ? (
                    <Lock className="w-3 h-3 text-muted-foreground/60" />
                  ) : (
                    <Unlock className="w-3 h-3 text-muted-foreground/60" />
                  )}
                  <Switch
                    checked={!card.locked}
                    onCheckedChange={(checked) => toggleCreditLock(card.lockKey!, !checked)}
                    className="scale-[0.55]"
                  />
                </div>
              )}
            </div>

            {/* Label + promo badge */}
            <p className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5 font-heading tracking-wide uppercase">
              {card.label}
              {(card as any).promo && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-500 text-[8px] font-bold normal-case animate-pulse">
                  <Flame className="w-2.5 h-2.5" />
                  Promo
                </span>
              )}
            </p>

            {/* Value */}
            <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">
              {card.value.toFixed(1)}
              {card.max !== undefined && (
                <span className="text-xs text-muted-foreground/60 font-normal ml-0.5">/{card.max}</span>
              )}
            </p>

            {/* Promo detail */}
            {(card as any).promo && (
              <p className="text-[9px] text-orange-500 font-medium mt-1">
                ⚡ +{currentAmount} / {currentInterval}h
              </p>
            )}

            {/* Progress bar */}
            {card.progress !== undefined && (
              <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", card.barColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(card.progress, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}

            {/* Info tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="absolute top-2.5 right-2.5 p-0.5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity">
                  <Info className="w-3 h-3 text-muted-foreground/40" />
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
