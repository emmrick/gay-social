import { Coins, Info, Clock, Lock, Unlock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useCreditLocks, LockableCredit } from '@/hooks/useCreditLocks';
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
  const { passiveCredits, dailyCredits, bonusCredits, purchasedCredits, totalCredits, maxDailyCredits, isLoading } = useCredits();
  const { locks, toggleLock, isToggling } = useCreditLocks();

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

  const LockToggle = ({ type, locked }: { type: LockableCredit; locked: boolean }) => (
    <div className="flex items-center gap-1.5">
      {locked ? (
        <Lock className="w-3 h-3 text-red-400" />
      ) : (
        <Unlock className="w-3 h-3 text-muted-foreground/50" />
      )}
      <Switch
        checked={locked}
        onCheckedChange={(val) => toggleLock(type, val)}
        disabled={isToggling}
        className="scale-75 origin-right"
      />
    </div>
  );

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
                Ordre d'utilisation : Quotidiens → Passif → Bonus → Achetés. Verrouillez un type pour le conserver.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      
      {/* Stacked progress bar — order left to right: Achetés, Bonus, Passif, Quotidien */}
      <div className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted/50",
        compact ? "h-2" : "h-4"
      )}>
        {/* Purchased - Light Blue (leftmost) */}
        <motion.div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-400 to-sky-300"
          initial={{ width: 0 }}
          animate={{ width: `${purchasedPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Bonus - Dark Blue */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-blue-600 to-blue-500"
          initial={{ width: 0 }}
          animate={{ 
            left: `${purchasedPercent}%`,
            width: `${bonusPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        />

        {/* Passive - Yellow/Gold */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-amber-400 to-yellow-300"
          initial={{ width: 0 }}
          animate={{ 
            left: `${purchasedPercent + bonusPercent}%`,
            width: `${passivePercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        />
        
        {/* Daily - Green (rightmost, used first) */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-green-500 to-green-400"
          initial={{ width: 0 }}
          animate={{ 
            left: `${purchasedPercent + bonusPercent + passivePercent}%`,
            width: `${dailyPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Credit breakdown details */}
      {!compact && showDetails && (
        <div className="space-y-2">
          {/* Daily credits - always first (cannot be locked) */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <span className="text-sm font-medium">Quotidien</span>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Rechargement automatique (utilisé en 1er)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                {dailyCredits.toFixed(1)}/{maxDailyCredits.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Passive credits */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded-lg border",
            locks.passive 
              ? "bg-amber-400/5 border-amber-400/10 opacity-70" 
              : "bg-amber-400/10 border-amber-400/20"
          )}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div>
                <span className="text-sm font-medium">Passif</span>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  +0.1 toutes les 6h
                  {locks.passive && <span className="text-red-400 font-medium ml-1">• Verrouillé</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {passiveCredits.toFixed(1)}/10.0
              </span>
              <LockToggle type="passive" locked={locks.passive} />
            </div>
          </div>

          {/* Bonus credits */}
          {bonusCredits > 0 && (
            <div className={cn(
              "flex items-center justify-between p-2 rounded-lg border",
              locks.bonus 
                ? "bg-blue-600/5 border-blue-600/10 opacity-70" 
                : "bg-blue-600/10 border-blue-600/20"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <div>
                  <span className="text-sm font-medium">Bonus</span>
                  <p className="text-xs text-muted-foreground">
                    Inscription, vérification, parrainage
                    {locks.bonus && <span className="text-red-400 font-medium ml-1">• Verrouillé</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {bonusCredits.toFixed(1)}
                </span>
                <LockToggle type="bonus" locked={locks.bonus} />
              </div>
            </div>
          )}

          {/* Purchased credits */}
          {purchasedCredits > 0 && (
            <div className={cn(
              "flex items-center justify-between p-2 rounded-lg border",
              locks.purchased 
                ? "bg-sky-400/5 border-sky-400/10 opacity-70" 
                : "bg-sky-400/10 border-sky-400/20"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-400" />
                <div>
                  <span className="text-sm font-medium">Achetés</span>
                  <p className="text-xs text-muted-foreground">
                    Crédits achetés via Revolut
                    {locks.purchased && <span className="text-red-400 font-medium ml-1">• Verrouillé</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums text-sky-500 dark:text-sky-400">
                  {purchasedCredits.toFixed(1)}
                </span>
                <LockToggle type="purchased" locked={locks.purchased} />
              </div>
            </div>
          )}
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
              <span>Passif: {passiveCredits.toFixed(1)}/10.0{locks.passive ? ' 🔒' : ''}</span>
            </div>
          )}
          {bonusCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Bonus: {bonusCredits.toFixed(1)}{locks.bonus ? ' 🔒' : ''}</span>
            </div>
          )}
          {purchasedCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Achetés: {purchasedCredits.toFixed(1)}{locks.purchased ? ' 🔒' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditBalanceBar;
