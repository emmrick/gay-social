import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumUserBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const PremiumUserBadge = ({ size = 'sm', className }: PremiumUserBadgeProps) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const iconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
  };

  return (
    <div 
      className={cn(
        "rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30",
        sizeClasses[size],
        className
      )}
      title="Membre Premium"
    >
      <Crown className={cn("text-white", iconSizes[size])} />
    </div>
  );
};

export default PremiumUserBadge;
