import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Loader2, ListOrdered, Euro, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePendingTasksHistory,
  useRecycleTask,
  getTaskTypeLabel,
  formatCentsReward,
} from '@/hooks/useModerationTaskQueue';

const PendingTasksPanel = () => {
  const { data: tasks, isLoading } = usePendingTasksHistory();
  const recycleTask = useRecycleTask();

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
                className="rounded-xl border border-primary/30 bg-primary/5 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getTaskTypeLabel(task.task_type)}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-xs max-w-full">
                        <Clock className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate">
                          {task.reserved_at && formatDistanceToNow(new Date(task.reserved_at), { addSuffix: true, locale: fr })}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end sm:text-right">
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <Euro className="w-3 h-3 mr-1" />
                        {formatCentsReward(task.reward_cents)}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        Réservée
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:w-auto"
                      disabled={recycleTask.isPending}
                      onClick={() => recycleTask.mutate(task.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Ré-attribuer
                    </Button>
                  </div>
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
      <ScrollArea className="max-h-[60vh] pr-1 sm:max-h-[calc(100vh-380px)]">
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
                  className="rounded-xl border border-border bg-card p-3 sm:p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {getTaskTypeLabel(task.task_type)}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pl-9 sm:pl-11">
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">
                        <Clock className="w-3 h-3 mr-1 shrink-0" />
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: fr })}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        <Euro className="w-3 h-3 mr-1 shrink-0" />
                        {formatCentsReward(task.reward_cents)}
                      </Badge>
                      {task.refused_by.length > 0 && (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1 shrink-0" />
                          {task.refused_by.length} refus
                        </Badge>
                      )}
                    </div>
                    <div className="pl-9 sm:pl-11">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs sm:w-auto h-8"
                        disabled={recycleTask.isPending}
                        onClick={() => recycleTask.mutate(task.id)}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Ré-attribuer
                      </Button>
                    </div>
                  </div>
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
