/**
 * SwipeStatsPanel — refonte design system.
 * KPIs Swipe + actions récentes, alignés sur AdminCard / StatTile.
 * Logique métier inchangée (Supabase queries identiques).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, X, EyeOff, MessageSquare, TrendingUp, Activity, Coins, Calendar } from 'lucide-react';
import { AdminCard, AdminSectionHeader, StatTile, EmptyState, AdminListSkeleton } from './ui';
import { cn } from '@/lib/utils';

const SwipeStatsPanel = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-swipe-stats'],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [totalResult, todayResult, weekResult, byTypeResult] = await Promise.all([
        supabase.from('swipe_actions').select('*', { count: 'exact', head: true }),
        supabase.from('swipe_actions').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('swipe_actions').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('swipe_actions').select('action_type, credits_spent').order('created_at', { ascending: false }).limit(500),
      ]);

      const actions = byTypeResult.data || [];
      const likes = actions.filter(a => a.action_type === 'like').length;
      const dislikes = actions.filter(a => a.action_type === 'dislike').length;
      const hides = actions.filter(a => a.action_type === 'hide').length;
      const totalCreditsSpent = actions.reduce((sum, a) => sum + (Number(a.credits_spent) || 0), 0);

      return {
        total: totalResult.count || 0,
        today: todayResult.count || 0,
        week: weekResult.count || 0,
        likes,
        dislikes,
        hides,
        totalCreditsSpent,
      };
    },
    refetchInterval: 30000,
  });

  const { data: recentActions = [] } = useQuery({
    queryKey: ['admin-recent-swipes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('swipe_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!data?.length) return [];
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      return data.map(action => ({
        ...action,
        username: profiles?.find(p => p.user_id === action.user_id)?.username || 'Inconnu',
      }));
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AdminListSkeleton count={3} />
      </div>
    );
  }

  const actionMeta: Record<string, { icon: React.ElementType; tone: string; label: string }> = {
    like: { icon: Heart, tone: 'text-emerald-500 bg-emerald-500/10', label: 'Like' },
    dislike: { icon: X, tone: 'text-red-500 bg-red-500/10', label: 'Dislike' },
    hide: { icon: EyeOff, tone: 'text-muted-foreground bg-muted/40', label: 'Masqué' },
    start_conversation: { icon: MessageSquare, tone: 'text-primary bg-primary/10', label: 'Conversation' },
  };

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        icon={Heart}
        eyebrow="Engagement"
        title="Statistiques Swipe"
      />

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total swipes" value={stats?.total || 0} icon={TrendingUp} accent="primary" />
        <StatTile label="Aujourd'hui" value={stats?.today || 0} icon={Calendar} accent="blue" />
        <StatTile label="7 derniers jours" value={stats?.week || 0} icon={Activity} accent="violet" />
        <StatTile
          label="Crédits dépensés"
          value={`${(stats?.totalCreditsSpent || 0).toFixed(1)}`}
          icon={Coins}
          accent="orange"
        />
      </div>

      {/* Répartition par action */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Likes" value={stats?.likes || 0} icon={Heart} accent="emerald" />
        <StatTile label="Dislikes" value={stats?.dislikes || 0} icon={X} accent="red" />
        <StatTile label="Masqués" value={stats?.hides || 0} icon={EyeOff} accent="primary" />
      </div>

      {/* Activité récente */}
      <AdminCard padding="md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activité récente
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {recentActions.length} dernières actions
          </span>
        </div>

        {recentActions.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Aucune activité récente"
            description="Les swipes des membres s'afficheront ici en temps réel."
          />
        ) : (
          <ScrollArea className="h-72">
            <div className="space-y-1.5 pr-2">
              {recentActions.map((action: any) => {
                const meta = actionMeta[action.action_type] || actionMeta.like;
                const Icon = meta.icon;
                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
                  >
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', meta.tone)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{action.username}</p>
                      <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      −{Number(action.credits_spent).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </AdminCard>
    </div>
  );
};

export default SwipeStatsPanel;
