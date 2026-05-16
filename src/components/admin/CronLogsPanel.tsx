import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CronRun {
  id: string;
  job_name: string;
  status: 'success' | 'error';
  duration_ms: number | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const CronLogsPanel = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');

  const { data: runs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cron-run-log', statusFilter, jobFilter],
    queryFn: async () => {
      let q = supabase
        .from('cron_run_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (jobFilter !== 'all') q = q.eq('job_name', jobFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CronRun[];
    },
    staleTime: 30_000,
  });

  const { data: jobNames } = useQuery({
    queryKey: ['cron-run-log-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cron_run_log')
        .select('job_name')
        .order('job_name')
        .limit(1000);
      const uniq = Array.from(new Set((data ?? []).map((r) => r.job_name)));
      return uniq;
    },
    staleTime: 5 * 60_000,
  });

  const stats = (() => {
    if (!runs) return null;
    const total = runs.length;
    const errors = runs.filter((r) => r.status === 'error').length;
    const success = total - errors;
    const avgDuration = runs
      .filter((r) => r.duration_ms != null)
      .reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / Math.max(1, runs.filter((r) => r.duration_ms != null).length);
    return { total, success, errors, avgDuration };
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Tâches planifiées (CRON)</h2>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground text-xs">Exécutions</div>
              <div className="font-semibold text-lg">{stats.total}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground text-xs">Succès</div>
              <div className="font-semibold text-lg text-emerald-600">{stats.success}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground text-xs">Erreurs</div>
              <div className={`font-semibold text-lg ${stats.errors > 0 ? 'text-red-600' : ''}`}>{stats.errors}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground text-xs">Durée moy.</div>
              <div className="font-semibold text-lg">{Math.round(stats.avgDuration)}ms</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="success">Succès</SelectItem>
              <SelectItem value="error">Erreurs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les tâches</SelectItem>
              {(jobNames ?? []).map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}

          {!isLoading && runs?.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Aucune exécution enregistrée.
            </div>
          )}

          {runs?.map((run) => (
            <div
              key={run.id}
              className={`rounded-lg border p-3 ${run.status === 'error' ? 'border-red-500/30 bg-red-500/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {run.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-mono text-sm truncate">{run.job_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: fr })}
                      {run.duration_ms != null && <span>· {run.duration_ms}ms</span>}
                    </div>
                  </div>
                </div>
                <Badge variant={run.status === 'error' ? 'destructive' : 'secondary'}>
                  {run.status === 'success' ? 'OK' : 'Erreur'}
                </Badge>
              </div>

              {run.error_message && (
                <pre className="mt-2 text-xs text-red-600 bg-red-500/10 p-2 rounded whitespace-pre-wrap break-all">
                  {run.error_message}
                </pre>
              )}

              {run.details && Object.keys(run.details).length > 0 && (
                <pre className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded whitespace-pre-wrap break-all">
                  {JSON.stringify(run.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CronLogsPanel;
