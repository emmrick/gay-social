import { useQuery } from '@tanstack/react-query';
import { startOfDay, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Activity, Shield, MessageSquare, UserPlus, Crown,
  AlertTriangle, IdCard, ShoppingCart, Headphones, ListOrdered,
  TrendingUp, Eye, Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AdminSection } from './AdminSidebar';

interface AdminDashboardProps {
  onNavigate: (section: AdminSection) => void;
  pendingReports: number;
  pendingVerifications: number;
  pendingPurchases: number;
  isAdmin: boolean;
}

const useQuickStats = () => {
  return useQuery({
    queryKey: ['admin-quick-stats'],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();

      const [
        { count: totalUsers },
        { count: onlineUsers },
        { count: verifiedUsers },
        { count: premiumUsers },
        { count: newUsersToday },
        { count: newUsersWeek },
        { count: totalMessages },
        { count: messagesWeek },
        { count: pendingTasks },
        { count: openTickets },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('moderation_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      return {
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        premiumUsers: premiumUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        totalMessages: totalMessages || 0,
        messagesWeek: messagesWeek || 0,
        pendingTasks: pendingTasks || 0,
        openTickets: openTickets || 0,
      };
    },
    refetchInterval: 30000,
  });
};

const AdminDashboard = ({ onNavigate, pendingReports, pendingVerifications, pendingPurchases, isAdmin }: AdminDashboardProps) => {
  const { data: stats, isLoading } = useQuickStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const onlinePercent = stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0;
  const verifiedPercent = stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;

  // Quick actions with urgency
  const urgentActions = [
    { id: 'pending-tasks' as AdminSection, label: 'Missions en attente', icon: ListOrdered, count: stats.pendingTasks, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'reports' as AdminSection, label: 'Signalements', icon: AlertTriangle, count: pendingReports, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'verification' as AdminSection, label: 'Vérifications', icon: IdCard, count: pendingVerifications, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'credit-purchases' as AdminSection, label: 'Achats crédits', icon: ShoppingCart, count: pendingPurchases, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'support' as AdminSection, label: 'Tickets ouverts', icon: Headphones, count: stats.openTickets, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ].filter(a => a.count > 0);

  return (
    <div className="space-y-6">
      {/* Urgent Actions */}
      {urgentActions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            ⚡ Actions urgentes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {urgentActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.label}</p>
                </div>
                <Badge variant="destructive" className="text-xs font-bold">
                  {action.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          📊 Vue d'ensemble
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            title="Membres"
            value={stats.totalUsers}
            icon={Users}
            color="text-primary"
            bg="bg-primary/10"
            onClick={() => onNavigate('users')}
          />
          <KPICard
            title="En ligne"
            value={stats.onlineUsers}
            subtitle={`${onlinePercent}%`}
            icon={Activity}
            color="text-green-500"
            bg="bg-green-500/10"
            pulse
          />
          <KPICard
            title="Vérifiés"
            value={stats.verifiedUsers}
            subtitle={`${verifiedPercent}%`}
            icon={Shield}
            color="text-blue-500"
            bg="bg-blue-500/10"
            onClick={() => onNavigate('users')}
          />
          <KPICard
            title="Premium"
            value={stats.premiumUsers}
            icon={Crown}
            color="text-amber-500"
            bg="bg-amber-500/10"
          />
        </div>
      </div>

      {/* Growth & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold">Croissance</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Aujourd'hui</span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                  +{stats.newUsersToday}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cette semaine</span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                  +{stats.newUsersWeek}
                </Badge>
              </div>
              <Progress value={Math.min((stats.newUsersWeek / 100) * 100, 100)} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">{stats.newUsersWeek}/100 objectif hebdo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold">Activité</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{stats.totalMessages.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Messages total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{stats.messagesWeek.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Cette semaine</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Msg/utilisateur</span>
              <span className="font-semibold">
                {stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation by Role */}
      {isAdmin && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            🔧 Accès rapide admin
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {([
              { id: 'users' as AdminSection, label: 'Utilisateurs', icon: Users },
              { id: 'credits' as AdminSection, label: 'Crédits', icon: TrendingUp },
              { id: 'moderators' as AdminSection, label: 'Modérateurs', icon: Eye },
              { id: 'broadcast' as AdminSection, label: 'Annonces', icon: Globe },
              { id: 'maintenance' as AdminSection, label: 'Maintenance', icon: Shield },
              { id: 'stats' as AdminSection, label: 'Stats détail', icon: Activity },
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({
  title, value, subtitle, icon: Icon, color, bg, pulse, onClick
}: {
  title: string; value: number; subtitle?: string;
  icon: React.ElementType; color: string; bg: string;
  pulse?: boolean; onClick?: () => void;
}) => (
  <Card
    className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
    onClick={onClick}
  >
    <CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium">{title}</p>
          <p className="text-xl font-bold mt-0.5">{value.toLocaleString()}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          {pulse ? (
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          ) : (
            <Icon className={`w-4 h-4 ${color}`} />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
