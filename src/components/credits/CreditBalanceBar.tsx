import { Coins, Info, Clock, Lock, Unlock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';

interface CreditBalanceBarProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
  showDetails?: boolean;
}

const CreditBalanceBar = ({ 
  className, 
  showLabel = true, 
  compact = false,
  showDetails = true 
}: CreditBalanceBarProps) => {
  const { 
    passiveCredits, dailyCredits, bonusCredits, purchasedCredits, totalCredits, maxDailyCredits, isLoading,
    lockPassive, lockBonus, lockPurchased, toggleCreditLock
  } = useCredits();

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-3 bg-muted rounded-full" />
      </div>
    );
  }

  // Calculate percentages for the stacked bar
  const total = Math.max(totalCredits, 1);
  const purchasedPercent = (purchasedCredits / total) * 100;
  const bonusPercent = (bonusCredits / total) * 100;
  const passivePercent = (passiveCredits / total) * 100;
  const dailyPercent = (dailyCredits / total) * 100;

  return (
    <div className={cn("space-y-3", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold">{totalCredits.toFixed(1)}</span>
              <span className="text-muted-foreground ml-1">crédits disponibles</span>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 hover:bg-muted rounded-full transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                Les crédits sont consommés dans l'ordre : Quotidiens → Passif → Bonus → Achetés. Vous pouvez verrouiller certains types pour les économiser.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      
      {/* Stacked progress bar */}
      <div className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted/50",
        compact ? "h-2" : "h-4"
      )}>
        {/* Purchased credits */}
        <motion.div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-400 to-sky-300"
          initial={{ width: 0 }}
          animate={{ width: `${purchasedPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Bonus credits */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-blue-600 to-blue-500"
          initial={{ width: 0 }}
          animate={{ left: `${purchasedPercent}%`, width: `${bonusPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        />
        {/* Passive credits */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-amber-400 to-yellow-300"
          initial={{ width: 0 }}
          animate={{ left: `${purchasedPercent + bonusPercent}%`, width: `${passivePercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        />
        {/* Daily credits */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-green-500 to-green-400"
          initial={{ width: 0 }}
          animate={{ left: `${purchasedPercent + bonusPercent + passivePercent}%`, width: `${dailyPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Credit breakdown details */}
      {!compact && showDetails && (
        <div className="space-y-2">
          {/* Daily credits - NOT lockable */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium">Quotidien</span>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">Rechargement auto (actif)</span>
                </p>
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400 shrink-0">
              {dailyCredits.toFixed(1)}/{maxDailyCredits.toFixed(1)}
            </span>
          </div>

          {/* Passive credits - lockable */}
          <div className={cn(
            "flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors",
            lockPassive 
              ? "bg-amber-400/5 border-amber-400/10 opacity-70" 
              : "bg-amber-400/10 border-amber-400/20"
          )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium">Passif</span>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  +0.1 / 6h
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {passiveCredits.toFixed(1)}/10.0
              </span>
              {lockPassive ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
              <Switch 
                checked={!lockPassive}
                onCheckedChange={(checked) => toggleCreditLock('lock_passive', !checked)}
                className="scale-[0.65]"
              />
            </div>
          </div>

          {/* Bonus credits - lockable */}
          <div className={cn(
            "flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors",
            lockBonus
              ? "bg-blue-600/5 border-blue-600/10 opacity-70"
              : "bg-blue-600/10 border-blue-600/20"
          )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium">Bonus</span>
                <p className="text-[10px] text-muted-foreground truncate">
                  Inscription, vérification, parrainage
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {bonusCredits.toFixed(1)}
              </span>
              {lockBonus ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
              <Switch 
                checked={!lockBonus}
                onCheckedChange={(checked) => toggleCreditLock('lock_bonus', !checked)}
                className="scale-[0.65]"
              />
            </div>
          </div>

          {/* Purchased credits - lockable */}
          <div className={cn(
            "flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors",
            lockPurchased
              ? "bg-sky-400/5 border-sky-400/10 opacity-70"
              : "bg-sky-400/10 border-sky-400/20"
          )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium">Achetés</span>
                <p className="text-[10px] text-muted-foreground truncate">
                  Crédits achetés via Revolut
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold tabular-nums text-sky-500 dark:text-sky-400">
                {purchasedCredits.toFixed(1)}
              </span>
              {lockPurchased ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
              <Switch 
                checked={!lockPurchased}
                onCheckedChange={(checked) => toggleCreditLock('lock_purchased', !checked)}
                className="scale-[0.65]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Simple Legend for compact mode */}
      {compact && totalCredits > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Quotidien: {dailyCredits.toFixed(1)}/{maxDailyCredits}</span>
          </div>
          {passiveCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Passif: {passiveCredits.toFixed(1)}/10.0{lockPassive ? ' 🔒' : ''}</span>
            </div>
          )}
          {bonusCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Bonus: {bonusCredits.toFixed(1)}{lockBonus ? ' 🔒' : ''}</span>
            </div>
          )}
          {purchasedCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Achetés: {purchasedCredits.toFixed(1)}{lockPurchased ? ' 🔒' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditBalanceBar;
