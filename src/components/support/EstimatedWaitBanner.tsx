import { Clock, Users, Infinity } from 'lucide-react';
import { useEstimatedWaitTime } from '@/hooks/useEstimatedWaitTime';
import { cn } from '@/lib/utils';

interface EstimatedWaitBannerProps {
  entityId: string | null;
  className?: string;
  compact?: boolean;
}

const EstimatedWaitBanner = ({ entityId, className, compact = false }: EstimatedWaitBannerProps) => {
  const { position, estimatedMinutes, onlineModerators, found, isLoading } = useEstimatedWaitTime(entityId);

  if (isLoading || !found) return null;

  const isIndefinite = onlineModerators === 0;

  if (compact) {
    return (
      <span className={cn("text-[10px] text-muted-foreground", className)}>
        {isIndefinite ? (
          '⏳ Attente indéfinie'
        ) : (
          `~${estimatedMinutes} min`
        )}
      </span>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-2",
      isIndefinite 
        ? "bg-orange-500/5 border-orange-500/20" 
        : "bg-primary/5 border-primary/20",
      className
    )}>
      {/* Position */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={cn("w-4 h-4", isIndefinite ? "text-orange-500" : "text-primary")} />
          <span className="text-sm font-medium">
            Position dans la file : <span className="font-bold">n° {position}</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{onlineModerators} opérateur{onlineModerators !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Estimated time */}
      <div className={cn(
        "flex items-center gap-2 text-xs rounded-lg px-3 py-2",
        isIndefinite ? "bg-orange-500/10 text-orange-600" : "bg-primary/10 text-primary"
      )}>
        {isIndefinite ? (
          <>
            <Infinity className="w-4 h-4 flex-shrink-0" />
            <span>Temps d'attente : <strong>indéfini</strong> — aucun opérateur disponible</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Temps d'attente estimé : <strong>~{estimatedMinutes} min</strong></span>
          </>
        )}
      </div>
    </div>
  );
};

export default EstimatedWaitBanner;
