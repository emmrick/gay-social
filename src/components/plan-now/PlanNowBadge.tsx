import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanNowBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  withLabel?: boolean;
  className?: string;
}

/**
 * Badge ⚡ animé "Plan Now" — signale un profil en mode recherche express.
 * Couleurs orange/amber pour distinguer du boost (rose/primary).
 */
const PlanNowBadge = ({ size = 'xs', withLabel = false, className }: PlanNowBadgeProps) => {
  const sizing = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  }[size];
  const iconSize = { xs: 'w-2.5 h-2.5', sm: 'w-3 h-3', md: 'w-3.5 h-3.5' }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold text-white shadow-sm',
        'bg-gradient-to-r from-amber-500 to-orange-500',
        'ring-1 ring-amber-300/50 animate-pulse',
        sizing,
        className,
      )}
      aria-label="Plan Now actif"
    >
      <Zap className={cn(iconSize, 'fill-white')} />
      {withLabel && <span>Plan Now</span>}
    </span>
  );
};

export default PlanNowBadge;
