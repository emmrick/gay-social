import { Crown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  showIfNotPremium?: boolean;
  className?: string;
}

const PremiumBadge = ({ showIfNotPremium = false, className = '' }: PremiumBadgeProps) => {
  const { isPremium, isVerifying, isLoading } = useSubscription();

  if (!isPremium && !showIfNotPremium) return null;

  if (isPremium) {
    return (
      <Badge className={cn(
        "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg relative",
        className
      )}>
        {isVerifying ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Crown className="w-3 h-3 mr-1" />
        )}
        Premium
      </Badge>
    );
  }

  // Show subtle loading state when checking premium status
  if (isLoading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", className)}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Vérification...
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      Gratuit
    </Badge>
  );
};

export default PremiumBadge;
