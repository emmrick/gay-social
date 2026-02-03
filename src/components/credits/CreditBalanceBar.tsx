import { Coins, Info } from 'lucide-react';
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
  const { dailyCredits, bonusCredits, purchasedCredits, totalCredits, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-3 bg-muted rounded-full" />
      </div>
    );
  }

  // Calculate percentages for the stacked bar
  const total = Math.max(totalCredits, 1); // Avoid division by zero
  const dailyPercent = (dailyCredits / total) * 100;
  const bonusPercent = (bonusCredits / total) * 100;
  const purchasedPercent = (purchasedCredits / total) * 100;

  const creditTypes = [
    { 
      name: 'Quotidien', 
      value: dailyCredits, 
      color: 'bg-green-500', 
      dotColor: 'bg-green-500',
      description: 'Crédits réclamés quotidiennement (max 7x/mois)'
    },
    { 
      name: 'Bonus', 
      value: bonusCredits, 
      color: 'bg-blue-600', 
      dotColor: 'bg-blue-600',
      description: 'Crédits gagnés (inscription, vérification, parrainage)'
    },
    { 
      name: 'Achetés', 
      value: purchasedCredits, 
      color: 'bg-sky-400', 
      dotColor: 'bg-sky-400',
      description: 'Crédits achetés via Revolut'
    },
  ].filter(type => type.value > 0);

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
        {/* Daily credits - Green */}
        <motion.div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400"
          initial={{ width: 0 }}
          animate={{ width: `${dailyPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* Bonus credits - Dark Blue */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-blue-600 to-blue-500"
          initial={{ width: 0 }}
          animate={{ 
            left: `${dailyPercent}%`,
            width: `${bonusPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        />
        
        {/* Purchased credits - Light Blue */}
        <motion.div 
          className="absolute top-0 h-full bg-gradient-to-r from-sky-400 to-sky-300"
          initial={{ width: 0 }}
          animate={{ 
            left: `${dailyPercent + bonusPercent}%`,
            width: `${purchasedPercent}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        />

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Detailed Legend */}
      {showDetails && !compact && creditTypes.length > 0 && (
        <div className="grid gap-2">
          {creditTypes.map((type, index) => (
            <motion.div 
              key={type.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", type.dotColor)} />
                <div>
                  <span className="text-sm font-medium">{type.name}</span>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {type.value.toFixed(1)}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Simple Legend for compact mode */}
      {!showDetails && !compact && totalCredits > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {dailyCredits > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Quotidien: {dailyCredits.toFixed(1)}</span>
            </div>
          )}
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
