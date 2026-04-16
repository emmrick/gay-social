/**
 * Single mission card — reused by Missions list (pending + reserved).
 */
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Euro, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTaskTypeLabel, formatCentsReward } from '@/hooks/useModerationTaskQueue';
import { cn } from '@/lib/utils';

interface MissionCardProps {
  task: any;
  index?: number;
  onRecycle?: (id: string) => void;
  recycling?: boolean;
}

const MissionCard = ({ task, index, onRecycle, recycling }: MissionCardProps) => {
  const isReserved = task.status === 'reserved';
  return (
    <div
      className={cn(
        'rounded-xl border p-3 sm:p-4 transition-colors hover:bg-muted/40',
        isReserved ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 sm:gap-3">
          {typeof index === 'number' && !isReserved && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
            </div>
          )}
          {isReserved && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {getTaskTypeLabel(task.task_type)}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:pl-11">
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            <Clock className="w-3 h-3 mr-1 shrink-0" />
            {formatDistanceToNow(new Date(isReserved ? task.reserved_at ?? task.created_at : task.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </Badge>
          <Badge variant="outline" className="text-[10px] sm:text-xs text-primary border-primary/30">
            <Euro className="w-3 h-3 mr-1 shrink-0" />
            {formatCentsReward(task.reward_cents)}
          </Badge>
          {isReserved && (
            <Badge variant="default" className="text-[10px] sm:text-xs">
              Réservée
            </Badge>
          )}
          {!isReserved && task.refused_by?.length > 0 && (
            <Badge variant="destructive" className="text-[10px] sm:text-xs">
              <AlertTriangle className="w-3 h-3 mr-1 shrink-0" />
              {task.refused_by.length} refus
            </Badge>
          )}
        </div>
        {onRecycle && (
          <div className="sm:pl-11">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs sm:w-auto h-8"
              disabled={recycling}
              onClick={() => onRecycle(task.id)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Ré-attribuer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionCard;
