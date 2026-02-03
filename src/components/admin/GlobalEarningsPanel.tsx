import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TrendingUp,
  Users,
  Euro,
  Calendar,
  Loader2,
  BarChart3,
  Download,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  formatCents,
  getTaskLabel,
  ModeratorTaskType,
} from '@/hooks/useModeratorEarnings';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

interface ModeratorStats {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_earned: number;
  task_count: number;
  by_type: Record<string, { count: number; total: number }>;
}

const TaskIcon = ({ type }: { type: ModeratorTaskType }) => {
  switch (type) {
    case 'identity_verification':
      return <span className="text-blue-500">🪪</span>;
    case 'report_response':
      return <span className="text-orange-500">🚨</span>;
    case 'user_suspension':
      return <span className="text-red-500">🔒</span>;
    case 'private_message_response':
      return <span className="text-green-500">💬</span>;
    default:
      return <span>📋</span>;
  }
};

const useGlobalEarnings = (period: PeriodFilter) => {
  return useQuery({
    queryKey: ['global-earnings', period],
    queryFn: async () => {
      // Calculate date range based on period
      let startDate: Date | null = null;
      const now = new Date();

      switch (period) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now, { locale: fr });
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'all':
        default:
          startDate = null;
      }

      // Fetch earnings
      let query = supabase
        .from('moderator_earnings')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: earnings, error } = await query;
      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(earnings?.map(e => e.user_id) || [])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Aggregate stats per moderator
      const moderatorStats: Map<string, ModeratorStats> = new Map();

      (earnings || []).forEach(earning => {
        const profile = profileMap.get(earning.user_id);
        
        if (!moderatorStats.has(earning.user_id)) {
          moderatorStats.set(earning.user_id, {
            user_id: earning.user_id,
            username: profile?.username || 'Utilisateur inconnu',
            avatar_url: profile?.avatar_url || null,
            total_earned: 0,
            task_count: 0,
            by_type: {},
          });
        }

        const stats = moderatorStats.get(earning.user_id)!;
        stats.total_earned += earning.amount_cents;
        stats.task_count += 1;

        const taskType = earning.task_type as string;
        if (!stats.by_type[taskType]) {
          stats.by_type[taskType] = { count: 0, total: 0 };
        }
        stats.by_type[taskType].count += 1;
        stats.by_type[taskType].total += earning.amount_cents;
      });

      // Calculate global totals
      const globalStats = {
        totalEarned: (earnings || []).reduce((sum, e) => sum + e.amount_cents, 0),
        totalTasks: earnings?.length || 0,
        moderatorCount: moderatorStats.size,
        byType: {} as Record<string, { count: number; total: number }>,
      };

      (earnings || []).forEach(e => {
        const type = e.task_type as string;
        if (!globalStats.byType[type]) {
          globalStats.byType[type] = { count: 0, total: 0 };
        }
        globalStats.byType[type].count += 1;
        globalStats.byType[type].total += e.amount_cents;
      });

      // Sort moderators by total earned
      const sortedModerators = Array.from(moderatorStats.values())
        .sort((a, b) => b.total_earned - a.total_earned);

      return {
        globalStats,
        moderators: sortedModerators,
        earnings: earnings || [],
      };
    },
  });
};

const GlobalEarningsPanel = () => {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const { data, isLoading } = useGlobalEarnings(period);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today':
        return "Aujourd'hui";
      case 'week':
        return 'Cette semaine';
      case 'month':
        return 'Ce mois';
      case 'all':
        return 'Tout le temps';
    }
  }, [period]);

  const maxEarned = useMemo(() => {
    if (!data?.moderators.length) return 0;
    return Math.max(...data.moderators.map(m => m.total_earned));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Gains globaux</h2>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble des gains de tous les modérateurs
            </p>
          </div>
        </div>

        {/* Period Filter */}
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="all">Tout le temps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Total gagné</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {formatCents(data?.globalStats.totalEarned || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Tâches</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {data?.globalStats.totalTasks || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Modérateurs actifs</span>
          </div>
          <p className="text-2xl font-bold text-purple-500">
            {data?.globalStats.moderatorCount || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Moy. / modérateur</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">
            {formatCents(
              data?.globalStats.moderatorCount
                ? Math.round(data.globalStats.totalEarned / data.globalStats.moderatorCount)
                : 0
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
        </div>
      </div>

      {/* Task Type Breakdown */}
      <div className="rounded-xl p-4 bg-card border border-border shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          Répartition par type de tâche
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data?.globalStats.byType || {}).map(([type, stats]) => (
            <div key={type} className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TaskIcon type={type as ModeratorTaskType} />
                <span className="text-xs truncate text-foreground">{getTaskLabel(type as ModeratorTaskType)}</span>
              </div>
              <p className="text-lg font-bold text-primary">{formatCents(stats.total)}</p>
              <p className="text-xs text-muted-foreground">{stats.count} tâches</p>
            </div>
          ))}
          {Object.keys(data?.globalStats.byType || {}).length === 0 && (
            <p className="col-span-4 text-center text-muted-foreground py-4">
              Aucune tâche pour cette période
            </p>
          )}
        </div>
      </div>

      {/* Moderators Leaderboard */}
      <div className="rounded-xl p-4 bg-card border border-border shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Users className="w-4 h-4 text-primary" />
          Classement des modérateurs
        </h3>
        
        <ScrollArea className="h-[400px]">
          {data?.moderators.length ? (
            <div className="space-y-3">
              {data.moderators.map((mod, index) => (
                <div
                  key={mod.user_id}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500 text-yellow-950' : ''}
                      ${index === 1 ? 'bg-gray-300 text-gray-700' : ''}
                      ${index === 2 ? 'bg-amber-600 text-amber-100' : ''}
                      ${index > 2 ? 'bg-secondary text-muted-foreground' : ''}
                    `}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={mod.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20">
                        {mod.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{mod.username}</span>
                        <Badge variant="outline" className="text-xs">
                          {mod.task_count} tâches
                        </Badge>
                      </div>
                      
                      {/* Progress bar relative to max */}
                      <div className="mt-2">
                        <Progress 
                          value={maxEarned > 0 ? (mod.total_earned / maxEarned) * 100 : 0} 
                          className="h-2" 
                        />
                      </div>

                      {/* Task breakdown */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {Object.entries(mod.by_type).map(([type, stats]) => (
                          <span key={type} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TaskIcon type={type as ModeratorTaskType} />
                            {stats.count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Earnings */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {formatCents(mod.total_earned)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée pour cette période</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default GlobalEarningsPanel;
