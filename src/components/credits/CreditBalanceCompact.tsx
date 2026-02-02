import { Coins, AlertTriangle } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useCreditDialog } from '@/contexts/CreditDialogContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CreditBalanceCompactProps {
  className?: string;
  onClick?: () => void;
}

/**
 * Compact credit balance display for header/navigation
 * Shows total credits with a small visual indicator
 * When credits are at 0, clicking shows the insufficient credits dialog
 */
const CreditBalanceCompact = ({ className, onClick }: CreditBalanceCompactProps) => {
  const { totalCredits, isLoading } = useCredits();
  const { showInsufficientCreditsDialog } = useCreditDialog();

  if (isLoading) {
    return (
      <div className={cn("animate-pulse flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted", className)}>
        <div className="w-4 h-4 rounded bg-muted-foreground/20" />
        <div className="w-8 h-3 rounded bg-muted-foreground/20" />
      </div>
    );
  }

  const isOutOfCredits = totalCredits <= 0;

  // Determine color based on credit amount
  const getCreditColor = () => {
    if (isOutOfCredits) return 'text-destructive bg-destructive/10 border-destructive/30 animate-pulse';
    if (totalCredits <= 1) return 'text-destructive bg-destructive/10 border-destructive/20';
    if (totalCredits <= 5) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-primary bg-primary/10 border-primary/20';
  };

  const handleClick = () => {
    if (isOutOfCredits) {
      // Show the insufficient credits dialog with 0 as required (triggers "out of credits" mode)
      showInsufficientCreditsDialog(0.1, 'Utiliser le site');
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all",
        "hover:shadow-md active:shadow-sm cursor-pointer",
        getCreditColor(),
        className
      )}
    >
      {isOutOfCredits ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Coins className="w-4 h-4" />
      )}
      <span className="text-xs font-semibold tabular-nums">
        {totalCredits.toFixed(1)}
      </span>
    </motion.button>
  );
};

export default CreditBalanceCompact;
