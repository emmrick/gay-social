import { Coins, Info, Clock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const { passiveCredits, dailyCredits, bonusCredits, purchasedCredits, totalCredits, maxDailyCredits, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-3 bg-muted rounded-full" />
      </div>
    );
  }

  // Calculate percentages for the stacked bar
  const total = Math.max(totalCredits, 1); // Avoid division by zero
  const passivePercent = (passiveCredits / total) * 100;
  const dailyPercent = (dailyCredits / total) * 100;
  const bonusPercent = (bonusCredits / total) * 100;
  const purchasedPercent = (purchasedCredits / total) * 100;

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
                Les crédits sont consommés dans l'ordre : Quotidiens → Bonus → Achetés
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      
      {/* Stacked progress bar with animation */}
      <div className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted/50",
        compact ? "h-2" : "h-4"
      )}>
        {/* Passive credits - Yellow/Gold (FIRST - used first) */}
        <motion.div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-yellow-300"
          initial={{ width: 0 }}
          animate={{ width: `${passivePercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Daily credits - Green (second) */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-green-500 to-green-400"
          initial={{ width: 0 }}
          animate={{ 
            left: `${passivePercent}%`,
            width: `${dailyPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        />
        
        {/* Bonus credits - Dark Blue (third) */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-blue-600 to-blue-500"
          initial={{ width: 0 }}
          animate={{ 
            left: `${passivePercent + dailyPercent}%`,
            width: `${bonusPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        />
        
        {/* Purchased credits - Light Blue (last) */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-sky-400 to-sky-300"
          initial={{ width: 0 }}
          animate={{ 
            left: `${passivePercent + dailyPercent + bonusPercent}%`,
            width: `${purchasedPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        />

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Credit breakdown details */}
      {!compact && showDetails && (
        <div className="space-y-2">
          {/* Passive credits - always show */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div>
                <span className="text-sm font-medium">Passif</span>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  +0.1 toutes les 2h (utilisé en premier)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {passiveCredits.toFixed(1)}/1.0
              </span>
            </div>
          </div>

          {/* Daily credits detail - always show */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <span className="text-sm font-medium">Quotidien</span>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Rechargement automatique à minuit
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                {dailyCredits.toFixed(1)}/{maxDailyCredits.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Bonus credits */}
          {bonusCredits > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-600/10 border border-blue-600/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <div>
                  <span className="text-sm font-medium">Bonus</span>
                  <p className="text-xs text-muted-foreground">
                    Inscription, vérification, parrainage
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {bonusCredits.toFixed(1)}
              </span>
            </div>
          )}

          {/* Purchased credits */}
          {purchasedCredits > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-sky-400/10 border border-sky-400/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-400" />
                <div>
                  <span className="text-sm font-medium">Achetés</span>
                  <p className="text-xs text-muted-foreground">
                    Crédits achetés via Revolut
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-sky-500 dark:text-sky-400">
                {purchasedCredits.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Simple Legend for compact mode */}
      {compact && totalCredits > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {passiveCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Passif: {passiveCredits.toFixed(1)}/1.0</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Quotidien: {dailyCredits.toFixed(1)}/{maxDailyCredits}</span>
          </div>
          {bonusCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Bonus: {bonusCredits.toFixed(1)}</span>
            </div>
          )}
          {purchasedCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Achetés: {purchasedCredits.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditBalanceBar;
