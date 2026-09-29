import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Save, Timer, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CronScheduleConfig {
  id: string;
  job_name: string;
  schedule: string;
  description: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  sync_error: string | null;
}

const PRESETS = [
  { label: 'Chaque minute', value: '* * * * *' },
  { label: '5 min', value: '*/5 * * * *' },
  { label: '15 min', value: '*/15 * * * *' },
  { label: '30 min', value: '*/30 * * * *' },
  { label: 'Chaque heure', value: '0 * * * *' },
  { label: 'Chaque jour 3h', value: '0 3 * * *' },
];

const CronSchedulesPanel = () => {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ['cron-schedule-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_schedule_config')
        .select('*')
        .order('job_name');
      if (error) throw error;
      return (data ?? []) as CronScheduleConfig[];
    },
    staleTime: 60_000,
  });

  const { data: lastRuns } = useQuery({
    queryKey: ['cron-last-runs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cron_run_log')
        .select('job_name,status,error_message,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      const map: Record<string, { status: string; error_message: string | null; created_at: string }> = {};
      (data ?? []).forEach((r) => { if (!map[r.job_name]) map[r.job_name] = r; });
      return map;
    },
    staleTime: 30_000,
  });

  const categoryOf = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('digest') || n.includes('email')) return 'E-mails';
    if (n.includes('sms')) return 'SMS';
    if (n.includes('exchange') || n.includes('photo')) return 'Modération photo';
    if (n.includes('suspension')) return 'Suspensions';
    if (n.includes('cleanup') || n.includes('purge') || n.includes('expire')) return 'Nettoyage';
    return 'Autre';
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string; schedule?: string; is_active?: boolean }) => {
      const { id, ...fields } = payload;
      const { error } = await supabase
        .from('cron_schedule_config')
        .update(fields)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, payload) => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[payload.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['cron-schedule-config'] });
      toast({ title: 'Fréquence mise à jour', description: 'La tâche a été replanifiée immédiatement.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Échec de la mise à jour', description: err.message, variant: 'destructive' });
    },
  });

  const resyncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('resync_all_cron_schedules');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cron-schedule-config'] });
      toast({ title: 'Synchronisation terminée', description: `${count} tâche(s) resynchronisée(s).` });
    },
    onError: (err: Error) => {
      toast({ title: 'Échec de la synchronisation', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="mb-6 border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-primary" />
          Fréquences des tâches planifiées
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => resyncMutation.mutate()}
          disabled={resyncMutation.isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
          Resynchroniser
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Format CRON (min heure jour mois jour-semaine). Toute modification est appliquée
          immédiatement, sans redéploiement.
        </p>

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}

        {configs?.map((cfg) => {
          const draft = drafts[cfg.id] ?? cfg.schedule;
          const dirty = draft !== cfg.schedule;
          return (
            <div
              key={cfg.id}
              className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{cfg.job_name}</span>
                  {!cfg.is_active && <Badge variant="secondary">en pause</Badge>}
                  {cfg.sync_error && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {cfg.sync_error}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{categoryOf(cfg.job_name)}</Badge>
                  {(() => {
                    const r = lastRuns?.[cfg.job_name];
                    if (!r) return <span>Aucune exécution enregistrée</span>;
                    return (
                      <span>
                        Dernier résultat :{' '}
                        <span className={r.status === 'error' ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                          {r.status === 'error' ? 'Erreur' : 'OK'}
                        </span>{' '}
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    );
                  })()}
                  {cfg.last_synced_at && (
                    <span>· Synchronisé {formatDistanceToNow(new Date(cfg.last_synced_at), { addSuffix: true, locale: fr })}</span>
                  )}
                </div>
                {lastRuns?.[cfg.job_name]?.error_message && (
                  <p className="mt-1 truncate text-xs text-destructive" title={lastRuns[cfg.job_name].error_message ?? ''}>
                    {lastRuns[cfg.job_name].error_message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDrafts((p) => ({ ...p, [cfg.id]: e.target.value }))}
                  className="h-9 w-40 font-mono text-xs"
                  aria-label={`Fréquence de ${cfg.job_name}`}
                />
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate({ id: cfg.id, schedule: draft.trim() })}
                  disabled={!dirty || saveMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Switch
                  checked={cfg.is_active}
                  onCheckedChange={(v) => saveMutation.mutate({ id: cfg.id, is_active: v })}
                  aria-label={`Activer ${cfg.job_name}`}
                />
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2 pt-1">
          {PRESETS.map((p) => (
            <Badge key={p.value} variant="outline" className="font-mono text-[10px]">
              {p.label} · {p.value}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CronSchedulesPanel;
