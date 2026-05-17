/**
 * Dense Linear-style Missions panel.
 * Features: KPI bar, type/SLA filters, search, bulk recycle, realtime sort by priority_score.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ListOrdered,
  Lock,
  Clock,
  RefreshCw,
  Search,
  Filter,
  X,
  Flame,
  TrendingUp,
  Timer,
  CheckSquare,
} from 'lucide-react';
import { useTasksStore } from '@/stores/admin/useTasksStore';
import { useRecycleTask } from '@/hooks/useModerationTaskQueue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionHeader, EmptyState, LoadingList, ErrorState } from '../_shared/AdminAtoms';
import MissionCard from './MissionCard';
import PhotoExchangeReviewDialog from '@/components/admin/PhotoExchangeReviewDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'support_chat', label: '🆘 Support' },
  { value: 'identity_verification', label: '🪪 Identité' },
  { value: 'report_review', label: '🚨 Signalements' },
  { value: 'content_moderation', label: '📸 Contenu' },
  { value: 'screenshot_investigation', label: '🛡️ Screenshots' },
  { value: 'tween_review', label: '🐦 Tween' },
  { value: 'photo_exchange_review', label: '🖼️ Échange photo' },
];

const SLA_FILTERS = [
  { value: 'all', label: 'Tout SLA' },
  { value: 'critical', label: '🔥 >15min' },
  { value: 'warning', label: '⚠️ >5min' },
  { value: 'fresh', label: '✓ Récent' },
];

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priorité' },
  { value: 'age', label: 'Ancienneté' },
  { value: 'reward', label: 'Récompense' },
  { value: 'refusals', label: 'Refus' },
];

const getSlaLevel = (createdAt: string): 'fresh' | 'warning' | 'critical' => {
  const ageMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (ageMin > 15) return 'critical';
  if (ageMin > 5) return 'warning';
  return 'fresh';
};

const MissionsPanel = () => {
  const { missions, missionsState, missionsError, fetchMissions } = useTasksStore();
  const recycleTask = useRecycleTask();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'age' | 'reward' | 'refusals'>('priority');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewExchangeId, setReviewExchangeId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchMissions('pending');
    const interval = setInterval(() => fetchMissions('pending', { force: true }), 15000);
    return () => clearInterval(interval);
  }, [fetchMissions]);

  // Auto-open photo-exchange review dialog when ?task=<id> targets one
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId) return;
    const local = missions.find((m) => m.id === taskId);
    if (local?.task_type === 'photo_exchange_review') {
      const exId = (local.metadata?.exchange_id as string) || local.target_entity_id;
      if (exId) {
        setReviewExchangeId(exId);
        const next = new URLSearchParams(searchParams);
        next.delete('task');
        setSearchParams(next, { replace: true });
        return;
      }
    }
    // Fallback: fetch the task directly (covers cases where store isn't loaded yet)
    (async () => {
      const { data } = await supabase
        .from('moderation_tasks')
        .select('id, task_type, target_entity_id, metadata')
        .eq('id', taskId)
        .maybeSingle();
      if (data?.task_type === 'photo_exchange_review') {
        const exId = ((data.metadata as any)?.exchange_id as string) || data.target_entity_id;
        if (exId) {
          setReviewExchangeId(exId);
          const next = new URLSearchParams(searchParams);
          next.delete('task');
          setSearchParams(next, { replace: true });
        }
      }
    })();
  }, [searchParams, missions, setSearchParams]);

  const { reserved, pending } = useMemo(() => {
    return {
      reserved: missions.filter((m) => m.status === 'reserved'),
      pending: missions.filter((m) => m.status === 'pending'),
    };
  }, [missions]);

  // KPI
  const kpi = useMemo(() => {
    const slaBreaches = pending.filter((m) => getSlaLevel(m.created_at) === 'critical').length;
    const totalRefusals = pending.reduce((acc, m) => acc + (m.refused_by?.length || 0), 0);
    const avgRefusals = pending.length > 0 ? (totalRefusals / pending.length).toFixed(1) : '0';
    const avgAgeMin =
      pending.length > 0
        ? Math.round(
            pending.reduce(
              (acc, m) => acc + (Date.now() - new Date(m.created_at).getTime()) / 60000,
              0,
            ) / pending.length,
          )
        : 0;
    return { slaBreaches, avgRefusals, avgAgeMin };
  }, [pending]);

  // Filter + sort
  const filteredPending = useMemo(() => {
    let list = pending;

    if (typeFilter !== 'all') {
      list = list.filter((m) => m.task_type === typeFilter);
    }
    if (slaFilter !== 'all') {
      list = list.filter((m) => getSlaLevel(m.created_at) === slaFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.description?.toLowerCase().includes(q) ||
          m.task_type?.toLowerCase().includes(q) ||
          m.target_user_id?.toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (sortBy === 'priority') {
      sorted.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    } else if (sortBy === 'age') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'reward') {
      sorted.sort((a, b) => (b.reward_cents || 0) - (a.reward_cents || 0));
    } else if (sortBy === 'refusals') {
      sorted.sort((a, b) => (b.refused_by?.length || 0) - (a.refused_by?.length || 0));
    }
    return sorted;
  }, [pending, typeFilter, slaFilter, search, sortBy]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredPending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPending.map((m) => m.id)));
    }
  };

  const bulkRecycle = async () => {
    const ids = Array.from(selected);
    toast.promise(
      Promise.all(ids.map((id) => recycleTask.mutateAsync(id))).then(() => {
        setSelected(new Set());
        fetchMissions('pending', { force: true });
      }),
      {
        loading: `Ré-attribution de ${ids.length} mission(s)...`,
        success: `${ids.length} mission(s) ré-attribuée(s)`,
        error: 'Échec de la ré-attribution',
      },
    );
  };

  const viewTarget = (userId: string) => {
    navigate(`/admin/membres?user=${userId}`);
  };

  const hasActiveFilters = typeFilter !== 'all' || slaFilter !== 'all' || search.trim() !== '';

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ListOrdered}
        title="File d'attente des missions"
        subtitle={
          missionsState === 'loading'
            ? 'Chargement...'
            : `${pending.length} en attente · ${reserved.length} réservée(s)`
        }
        right={
          <div className="flex items-center gap-1.5">
            <Button
              variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
              className="h-8"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  •
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMissions('pending', { force: true })}
              disabled={missionsState === 'loading'}
              className="h-8"
            >
              <RefreshCw
                className={cn('w-3.5 h-3.5', missionsState === 'loading' && 'animate-spin')}
              />
            </Button>
          </div>
        }
      />

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KpiTile
          label="En attente"
          value={pending.length}
          icon={Clock}
          tone="default"
        />
        <KpiTile
          label="SLA dépassé"
          value={kpi.slaBreaches}
          icon={Flame}
          tone={kpi.slaBreaches > 0 ? 'danger' : 'default'}
        />
        <KpiTile
          label="Âge moyen"
          value={`${kpi.avgAgeMin}m`}
          icon={Timer}
          tone={kpi.avgAgeMin > 10 ? 'warning' : 'default'}
        />
        <KpiTile
          label="Refus moy."
          value={kpi.avgRefusals}
          icon={TrendingUp}
          tone="default"
        />
      </div>

      {/* Filters */}
      {(showFilters || hasActiveFilters) && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (description, type, user ID)..."
              className="pl-8 h-8 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">
              Type
            </span>
            {TYPE_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={typeFilter === f.value}
                onClick={() => setTypeFilter(f.value)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">
              SLA
            </span>
            {SLA_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={slaFilter === f.value}
                onClick={() => setSlaFilter(f.value)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">
              Tri
            </span>
            {SORT_OPTIONS.map((s) => (
              <FilterChip
                key={s.value}
                label={s.label}
                active={sortBy === s.value}
                onClick={() => setSortBy(s.value as any)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
          <span className="text-xs font-medium text-foreground">
            {selected.size} sélectionnée(s)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={bulkRecycle}
              disabled={recycleTask.isPending}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Ré-attribuer en lot
            </Button>
          </div>
        </div>
      )}

      {missionsState === 'loading' && missions.length === 0 && <LoadingList rows={4} />}

      {missionsState === 'error' && (
        <ErrorState
          message={missionsError ?? undefined}
          onRetry={() => fetchMissions('pending', { force: true })}
        />
      )}

      {missionsState !== 'loading' && missions.length === 0 && (
        <EmptyState
          icon={ListOrdered}
          title="Aucune mission en attente"
          description="Les nouvelles missions apparaîtront ici automatiquement"
        />
      )}

      {/* Reserved */}
      {reserved.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Réservées ({reserved.length})
            </p>
          </div>
          <div className="space-y-1">
            {reserved.map((task) => (
              <MissionCard
                key={task.id}
                task={task}
                onRecycle={(id) => recycleTask.mutate(id)}
                onViewTarget={viewTarget}
                onOpenTask={(t) => {
                  const exId = (t.metadata?.exchange_id as string) || t.target_entity_id;
                  if (exId) setReviewExchangeId(exId);
                }}
                recycling={recycleTask.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              En attente ({filteredPending.length}
              {filteredPending.length !== pending.length && ` / ${pending.length}`})
            </p>
            {filteredPending.length > 0 && (
              <button
                onClick={selectAll}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <CheckSquare className="w-3 h-3" />
                {selected.size === filteredPending.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>
          <ScrollArea className="max-h-[60vh] pr-1 sm:max-h-[calc(100vh-450px)]">
            <div className="space-y-1">
              {filteredPending.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucune mission ne correspond aux filtres
                </p>
              ) : (
                filteredPending.map((task, idx) => (
                  <MissionCard
                    key={task.id}
                    task={task}
                    index={idx}
                    selected={selected.has(task.id)}
                    onToggleSelect={toggleSelect}
                    onRecycle={(id) => recycleTask.mutate(id)}
                    onViewTarget={viewTarget}
                    onOpenTask={(t) => {
                      const exId = (t.metadata?.exchange_id as string) || t.target_entity_id;
                      if (exId) setReviewExchangeId(exId);
                    }}
                    recycling={recycleTask.isPending}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <PhotoExchangeReviewDialog
        exchangeId={reviewExchangeId}
        open={!!reviewExchangeId}
        onOpenChange={(o) => !o && setReviewExchangeId(null)}
      />
    </div>
  );
};

const KpiTile = ({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<any>;
  tone?: 'default' | 'warning' | 'danger';
}) => (
  <div
    className={cn(
      'p-2.5 rounded-lg border bg-card',
      tone === 'warning' && 'border-amber-500/30 bg-amber-500/5',
      tone === 'danger' && 'border-rose-500/30 bg-rose-500/5',
      tone === 'default' && 'border-border',
    )}
  >
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon
        className={cn(
          'w-3 h-3',
          tone === 'warning' && 'text-amber-600',
          tone === 'danger' && 'text-rose-600',
          tone === 'default' && 'text-muted-foreground',
        )}
      />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
    </div>
    <p
      className={cn(
        'text-lg font-bold tabular-nums leading-none',
        tone === 'warning' && 'text-amber-600',
        tone === 'danger' && 'text-rose-600',
        tone === 'default' && 'text-foreground',
      )}
    >
      {value}
    </p>
  </div>
);

const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
    )}
  >
    {label}
  </button>
);

export default MissionsPanel;
