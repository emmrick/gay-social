import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Loader2, ListOrdered, Euro, User, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePendingTasksHistory,
  getTaskTypeLabel,
  formatCentsReward,
} from '@/hooks/useModerationTaskQueue';

const PendingTasksPanel = () => {
  const { data: tasks, isLoading } = usePendingTasksHistory();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ListOrdered className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">File d'attente des missions</h2>
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const pendingTasks = tasks?.filter(t => t.status === 'pending') || [];
  const reservedTasks = tasks?.filter(t => t.status === 'reserved') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <ListOrdered className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">File d'attente des missions</h2>
          <p className="text-sm text-muted-foreground">
            {pendingTasks.length} en attente · {reservedTasks.length} réservée(s)
          </p>
        </div>
      </div>

      {/* Reserved tasks */}
      {reservedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Réservées
          </p>
          <div className="space-y-2">
            {reservedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl p-4 border border-primary/30 bg-primary/5 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getTaskTypeLabel(task.task_type)}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {task.reserved_at && formatDistanceToNow(new Date(task.reserved_at), { addSuffix: true, locale: fr })}
                    </Badge>
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <Badge variant="outline" className="text-primary border-primary/30">
                    <Euro className="w-3 h-3 mr-1" />
                    {formatCentsReward(task.reward_cents)}
                  </Badge>
                  <Badge variant="default" className="mt-1 block text-xs">
                    Réservée
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending tasks */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          En attente ({pendingTasks.length})
        </p>
        <ScrollArea className="h-[calc(100vh-380px)]">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListOrdered className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Aucune mission en attente</p>
              <p className="text-xs mt-1">Les nouvelles missions apparaîtront ici automatiquement</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="rounded-xl p-4 border border-border bg-card flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getTaskTypeLabel(task.task_type)}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: fr })}
                        {task.refused_by.length > 0 && (
                          <span className="ml-2 text-destructive">
                            · {task.refused_by.length} refus
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2">
                    <Euro className="w-3 h-3 mr-1" />
                    {formatCentsReward(task.reward_cents)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default PendingTasksPanel;
