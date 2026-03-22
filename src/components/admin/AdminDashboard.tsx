import { useQuery } from '@tanstack/react-query';
import { startOfDay, subDays, subHours, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Activity, Shield, MessageSquare, UserPlus, Crown,
  AlertTriangle, IdCard, ShoppingCart, Headphones, ListOrdered,
  TrendingUp, Eye, Globe, ArrowRight, Zap, Image, Clock,
  BarChart3, Hash, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AdminSection } from './AdminSidebar';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

interface AdminDashboardProps {
  onNavigate: (section: AdminSection) => void;
  pendingReports: number;
  pendingVerifications: number;
  pendingPurchases: number;
  isAdmin: boolean;
}

const useFullDashboardStats = () => {
  return useQuery({
    queryKey: ['admin-full-dashboard'],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();
      const monthAgo = subDays(today, 30).toISOString();

      const cq = (table: string, filters?: Record<string, any>, gte?: { col: string; val: string }) => {
        let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
        if (filters) Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v) as any; });
        if (gte) q = q.gte(gte.col, gte.val) as any;
        return q as any;
      };

      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        cq('profiles'),
        cq('profiles', { is_online: true }),
        cq('profiles', { is_verified: true }),
        cq('profiles', { is_premium: true }),
        cq('profiles', undefined, { col: 'created_at', val: startOfToday }),
        cq('profiles', undefined, { col: 'created_at', val: weekAgo }),
        cq('profiles', undefined, { col: 'created_at', val: monthAgo }),
        cq('messages'),
      ]);

      const [r9, r10, r11, r12, r13, r14, r15] = await Promise.all([
        cq('messages', undefined, { col: 'created_at', val: weekAgo }),
        cq('messages', undefined, { col: 'created_at', val: startOfToday }),
        cq('moderation_tasks', { status: 'pending' }),
        cq('support_tickets', { status: 'open' }),
        cq('profile_photos'),
        cq('user_albums'),
        cq('private_conversations'),
      ]);

      const [r16, r17, r18, r19, r20] = await Promise.all([
        cq('moderation_tasks', { status: 'completed' }),
        supabase.from('profiles').select('username, avatar_url, region, created_at, is_verified, is_online').order('created_at', { ascending: false }).limit(8),
        supabase.from('profiles').select('region'),
        supabase.from('profiles').select('created_at').gte('created_at', weekAgo).order('created_at', { ascending: true }),
        supabase.from('moderation_tasks').select('task_type, status, created_at, description').order('created_at', { ascending: false }).limit(10),
      ]);

      const totalUsers = r1.count || 0;
      const onlineUsers = r2.count || 0;
      const verifiedUsers = r3.count || 0;
      const premiumUsers = r4.count || 0;
      const newUsersToday = r5.count || 0;
      const newUsersWeek = r6.count || 0;
      const newUsersMonth = r7.count || 0;
      const totalMessages = r8.count || 0;
      const messagesWeek = r9.count || 0;
      const messagesToday = r10.count || 0;
      const pendingTasks = r11.count || 0;
      const openTickets = r12.count || 0;
      const totalPhotos = r13.count || 0;
      const totalAlbums = r14.count || 0;
      const totalConversations = r15.count || 0;
      const completedTasks = r16.count || 0;
      const recentUsers = r17.data;
      const regionData = r18.data;
      const dailySignups = r19.data;
      const recentActivity = r20.data;

      // Build daily signups chart data
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        dailyMap[format(d, 'EEE', { locale: fr })] = 0;
      }
      dailySignups?.forEach((p: any) => {
        const day = format(new Date(p.created_at), 'EEE', { locale: fr });
        if (dailyMap[day] !== undefined) dailyMap[day]++;
      });
      const signupChartData = Object.entries(dailyMap).map(([day, count]) => ({ day, count }));

      // Region stats
      const regionCounts: Record<string, number> = {};
      regionData?.forEach((p: any) => {
        if (p.region) regionCounts[p.region] = (regionCounts[p.region] || 0) + 1;
      });
      const topRegions = Object.entries(regionCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      return {
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        premiumUsers: premiumUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        newUsersMonth: newUsersMonth || 0,
        totalMessages: totalMessages || 0,
        messagesWeek: messagesWeek || 0,
        messagesToday: messagesToday || 0,
        pendingTasks: pendingTasks || 0,
        openTickets: openTickets || 0,
        totalPhotos: totalPhotos || 0,
        totalAlbums: totalAlbums || 0,
        totalConversations: totalConversations || 0,
        completedTasks: completedTasks || 0,
        recentUsers: recentUsers || [],
        topRegions,
        signupChartData,
        recentActivity: recentActivity || [],
      };
    },
    refetchInterval: 30000,
  });
};

const COLORS = ['hsl(var(--primary))', 'hsl(220, 70%, 55%)', 'hsl(280, 60%, 55%)', 'hsl(340, 65%, 55%)', 'hsl(160, 60%, 45%)', 'hsl(30, 70%, 55%)'];

const AdminDashboard = ({ onNavigate, pendingReports, pendingVerifications, pendingPurchases, isAdmin }: AdminDashboardProps) => {
  const { data: stats, isLoading } = useFullDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const onlinePercent = stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0;
  const verifiedPercent = stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;
  const premiumPercent = stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0;

  const urgentActions = [
    { id: 'pending-tasks' as AdminSection, label: 'Missions', icon: ListOrdered, count: stats.pendingTasks, color: 'text-orange-500', bg: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
    { id: 'reports' as AdminSection, label: 'Signalements', icon: AlertTriangle, count: pendingReports, color: 'text-red-500', bg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
    { id: 'verification' as AdminSection, label: 'Vérifications', icon: IdCard, count: pendingVerifications, color: 'text-blue-500', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
    { id: 'credit-purchases' as AdminSection, label: 'Achats', icon: ShoppingCart, count: pendingPurchases, color: 'text-emerald-500', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    { id: 'support' as AdminSection, label: 'Support', icon: Headphones, count: stats.openTickets, color: 'text-violet-500', bg: 'bg-violet-500/10', borderColor: 'border-violet-500/20' },
  ].filter(a => a.count > 0);

  const taskTypeLabel = (type: string) => {
    const map: Record<string, { label: string; icon: string }> = {
      identity_verification: { label: 'Vérification', icon: '🪪' },
      report_review: { label: 'Signalement', icon: '⚠️' },
      support_chat: { label: 'Support', icon: '💬' },
      credit_management: { label: 'Crédits', icon: '💰' },
      content_moderation: { label: 'Contenu', icon: '📷' },
    };
    return map[type] || { label: type, icon: '📋' };
  };

  const pieData = [
    { name: 'Vérifiés', value: stats.verifiedUsers },
    { name: 'Non vérifiés', value: stats.totalUsers - stats.verifiedUsers },
  ];

  return (
    <div className="space-y-6">
      {/* Urgent Actions Banner */}
      {urgentActions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold">Actions urgentes</h3>
            <Badge variant="secondary" className="text-[10px] h-5">
              {urgentActions.reduce((acc, a) => acc + a.count, 0)} en attente
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {urgentActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={cn(
                  "flex flex-col items-start gap-2 p-3 rounded-xl border transition-all",
                  "hover:shadow-md active:scale-[0.98]",
                  action.borderColor, action.bg
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <action.icon className={cn("w-4 h-4", action.color)} />
                  <span className={cn("text-lg font-bold", action.color)}>{action.count}</span>
                </div>
                <span className="text-[11px] font-medium text-foreground/70">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Membres" value={stats.totalUsers} icon={Users} trend={`+${stats.newUsersToday} aujourd'hui`} onClick={() => onNavigate('users')} />
        <KPICard title="En ligne" value={stats.onlineUsers} icon={Activity} trend={`${onlinePercent}% actifs`} pulse />
        <KPICard title="Vérifiés" value={stats.verifiedUsers} icon={Shield} trend={`${verifiedPercent}%`} onClick={() => onNavigate('verification')} />
        <KPICard title="Premium" value={stats.premiumUsers} icon={Crown} trend={`${premiumPercent}%`} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <MiniKPI label="Messages total" value={stats.totalMessages} icon={MessageSquare} />
        <MiniKPI label="Msg aujourd'hui" value={stats.messagesToday} icon={Clock} />
        <MiniKPI label="Msg / semaine" value={stats.messagesWeek} icon={BarChart3} />
        <MiniKPI label="Photos" value={stats.totalPhotos} icon={Image} />
        <MiniKPI label="Albums" value={stats.totalAlbums} icon={Hash} />
        <MiniKPI label="Conversations" value={stats.totalConversations} icon={Wallet} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signups Chart */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" />
              Inscriptions (7 jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.signupChartData}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#signupGrad)" name="Inscriptions" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between px-2 mt-1">
              <span className="text-xs text-muted-foreground">Total semaine: <strong className="text-foreground">+{stats.newUsersWeek}</strong></span>
              <span className="text-xs text-muted-foreground">Ce mois: <strong className="text-foreground">+{stats.newUsersMonth}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Top Regions */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Top départements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.topRegions} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Membres">
                  {stats.topRegions.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Users */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Derniers inscrits
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onNavigate('users')}>
                Voir tout <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2.5">
              {stats.recentUsers.slice(0, 6).map((user: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {(user.username || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{user.username || 'Sans nom'}</span>
                      {user.is_verified && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                      {user.is_online && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Dép. {user.region} · {format(new Date(user.created_at), 'dd/MM HH:mm')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Moderation Activity */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Activité modération
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] h-5">
                {stats.completedTasks} traitées
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              {stats.recentActivity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune activité récente</p>
              ) : (
                stats.recentActivity.slice(0, 6).map((task: any, i: number) => {
                  const info = taskTypeLabel(task.task_type);
                  return (
                    <div key={i} className="flex items-start gap-2.5 py-1">
                      <span className="text-sm flex-shrink-0 mt-0.5">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.description || info.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(task.created_at), 'dd/MM HH:mm')}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[9px] h-4 px-1.5",
                              task.status === 'completed' && "bg-green-500/10 text-green-600",
                              task.status === 'pending' && "bg-orange-500/10 text-orange-600",
                              task.status === 'reserved' && "bg-blue-500/10 text-blue-600",
                            )}
                          >
                            {task.status === 'completed' ? 'Terminée' : task.status === 'pending' ? 'En attente' : 'En cours'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health */}
      <Card className="border-border/40">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Santé de la plateforme
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HealthMetric
              label="Taux en ligne"
              value={onlinePercent}
              suffix="%"
              color={onlinePercent > 20 ? 'green' : onlinePercent > 5 ? 'orange' : 'red'}
            />
            <HealthMetric
              label="Taux vérification"
              value={verifiedPercent}
              suffix="%"
              color={verifiedPercent > 60 ? 'green' : verifiedPercent > 30 ? 'orange' : 'red'}
            />
            <HealthMetric
              label="Msg / utilisateur"
              value={stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0}
              color="blue"
            />
            <HealthMetric
              label="Tâches en attente"
              value={stats.pendingTasks}
              color={stats.pendingTasks === 0 ? 'green' : stats.pendingTasks < 5 ? 'orange' : 'red'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Accès rapide</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {([
              { id: 'users' as AdminSection, label: 'Utilisateurs', icon: Users },
              { id: 'credits-surveillance' as AdminSection, label: 'Crédits', icon: TrendingUp },
              { id: 'moderators' as AdminSection, label: 'Équipe', icon: Eye },
              { id: 'broadcast' as AdminSection, label: 'Broadcast', icon: Globe },
              { id: 'maintenance' as AdminSection, label: 'Maintenance', icon: Shield },
              { id: 'stats' as AdminSection, label: 'Analytics', icon: BarChart3 },
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/50 transition-all active:scale-[0.97]"
              >
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
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
  title, value, icon: Icon, trend, pulse, onClick
}: {
  title: string; value: number; trend?: string;
  icon: React.ElementType; pulse?: boolean; onClick?: () => void;
}) => (
  <Card
    className={cn(
      "overflow-hidden border-border/40 transition-all",
      onClick && "cursor-pointer hover:shadow-md hover:border-border/60 active:scale-[0.98]"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
          {pulse ? (
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          ) : (
            <Icon className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{title}</span>
        {trend && <span className="text-[10px] text-muted-foreground">{trend}</span>}
      </div>
    </CardContent>
  </Card>
);

const MiniKPI = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-border/30 bg-card">
    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-base font-bold">{value.toLocaleString()}</span>
    <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

const HealthMetric = ({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) => {
  const colorMap: Record<string, string> = {
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
  };
  const bgMap: Record<string, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };
  return (
    <div className="text-center space-y-2">
      <p className={cn("text-2xl font-bold", colorMap[color])}>
        {value}{suffix}
      </p>
      <Progress value={Math.min(value, 100)} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

export default AdminDashboard;
