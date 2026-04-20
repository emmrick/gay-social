import { useQuery } from '@tanstack/react-query';
import { startOfDay, subDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Activity, Shield, MessageSquare, UserPlus,
  AlertTriangle, IdCard, ShoppingCart, Headphones, ListOrdered,
  TrendingUp, Eye, Globe, ArrowRight, Zap, Image, Clock,
  BarChart3, Hash, Wallet, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AdminSection } from './AdminSidebar';
import { StatTile, ActionTile, AdminSectionHeader, AdminCard, EmptyState } from './ui';
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
        cq('profiles'), cq('profiles', { is_online: true }), cq('profiles', { is_verified: true }),
        cq('credit_transactions'), cq('profiles', undefined, { col: 'created_at', val: startOfToday }),
        cq('profiles', undefined, { col: 'created_at', val: weekAgo }),
        cq('profiles', undefined, { col: 'created_at', val: monthAgo }), cq('messages'),
      ]);

      const [r9, r10, r11, r12, r13, r14, r15] = await Promise.all([
        cq('messages', undefined, { col: 'created_at', val: weekAgo }),
        cq('messages', undefined, { col: 'created_at', val: startOfToday }),
        cq('moderation_tasks', { status: 'pending' }), cq('support_tickets', { status: 'open' }),
        cq('profile_photos'), cq('user_albums'), cq('private_conversations'),
      ]);

      const [r16, r17, r18, r19, r20] = await Promise.all([
        cq('moderation_tasks', { status: 'completed' }),
        supabase.from('profiles').select('username, avatar_url, region, created_at, is_verified, is_online').order('created_at', { ascending: false }).limit(8),
        supabase.from('profiles').select('region'),
        supabase.from('profiles').select('created_at').gte('created_at', weekAgo).order('created_at', { ascending: true }),
        supabase.from('moderation_tasks').select('task_type, status, created_at, description').order('created_at', { ascending: false }).limit(10),
      ]);

      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        dailyMap[format(d, 'EEE', { locale: fr })] = 0;
      }
      r19.data?.forEach((p: any) => {
        const day = format(new Date(p.created_at), 'EEE', { locale: fr });
        if (dailyMap[day] !== undefined) dailyMap[day]++;
      });

      const regionCounts: Record<string, number> = {};
      r18.data?.forEach((p: any) => { if (p.region) regionCounts[p.region] = (regionCounts[p.region] || 0) + 1; });

      return {
        totalUsers: r1.count || 0, onlineUsers: r2.count || 0, verifiedUsers: r3.count || 0,
        newUsersToday: r5.count || 0, newUsersWeek: r6.count || 0, newUsersMonth: r7.count || 0,
        totalMessages: r8.count || 0, messagesWeek: r9.count || 0, messagesToday: r10.count || 0,
        pendingTasks: r11.count || 0, openTickets: r12.count || 0,
        totalPhotos: r13.count || 0, totalAlbums: r14.count || 0, totalConversations: r15.count || 0,
        completedTasks: r16.count || 0, recentUsers: r17.data || [],
        topRegions: Object.entries(regionCounts).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count).slice(0, 6),
        signupChartData: Object.entries(dailyMap).map(([day, count]) => ({ day, count })),
        recentActivity: r20.data || [],
      };
    },
    refetchInterval: 30000,
  });
};

const COLORS = ['hsl(var(--primary))', 'hsl(220, 70%, 55%)', 'hsl(280, 60%, 55%)', 'hsl(340, 65%, 55%)', 'hsl(160, 60%, 45%)', 'hsl(30, 70%, 55%)'];

const AdminDashboard = ({ onNavigate, pendingReports, pendingVerifications, pendingPurchases, isAdmin }: AdminDashboardProps) => {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useFullDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const onlinePercent = stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0;
  const verifiedPercent = stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;

  const urgentActions = ([
    { id: 'pending-tasks' as AdminSection, label: 'Missions', icon: ListOrdered, count: stats.pendingTasks, accent: 'orange' as const },
    { id: 'reports' as AdminSection, label: 'Signalements', icon: AlertTriangle, count: pendingReports, accent: 'red' as const },
    { id: 'verification' as AdminSection, label: 'Vérifications', icon: IdCard, count: pendingVerifications, accent: 'blue' as const },
    { id: 'credit-purchases' as AdminSection, label: 'Achats', icon: ShoppingCart, count: pendingPurchases, accent: 'emerald' as const },
    { id: 'support' as AdminSection, label: 'Support', icon: Headphones, count: stats.openTickets, accent: 'violet' as const },
  ]).filter((a) => a.count > 0);

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

  const totalPending = pendingReports + pendingVerifications + pendingPurchases + stats.pendingTasks + stats.openTickets;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'Bonne nuit';
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();
  const displayName = profile?.username || (isAdmin ? 'Admin' : 'Modérateur');

  return (
    <div className="space-y-6">
      {/* Hero — salutation + snapshot temps réel */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 md:p-6">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
                {isAdmin ? 'Console Admin' : 'Console Modération'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight">
              {greeting}, <span className="text-primary">{displayName}</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {totalPending > 0
                ? `Vous avez ${totalPending} élément${totalPending > 1 ? 's' : ''} à traiter aujourd'hui.`
                : 'Tout est à jour. Excellent travail 🎉'}
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <HeroPill label="En ligne" value={stats.onlineUsers} dotClass="bg-emerald-500" pulse />
            <HeroPill label="Aujourd'hui" value={`+${stats.newUsersToday}`} dotClass="bg-blue-500" />
            {totalPending > 0 && (
              <HeroPill label="À traiter" value={totalPending} dotClass="bg-orange-500" />
            )}
          </div>
        </div>
      </section>

      {/* Urgent Actions */}
      {urgentActions.length > 0 && (
        <section className="animate-fade-in">
          <AdminSectionHeader
            icon={Zap}
            eyebrow="À traiter"
            title="Actions urgentes"
            action={
              <Badge variant="secondary" className="text-[10px] h-5 bg-orange-500/10 text-orange-600 border-orange-500/20">
                {urgentActions.reduce((acc, a) => acc + a.count, 0)} en attente
              </Badge>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {urgentActions.map((action, i) => (
              <div key={action.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <ActionTile
                  label={action.label}
                  icon={action.icon}
                  count={action.count}
                  accent={action.accent}
                  onClick={() => onNavigate(action.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KPI Cards */}
      <section className="animate-fade-in" style={{ animationDelay: '60ms' }}>
        <AdminSectionHeader eyebrow="Vue d'ensemble" title="Indicateurs clés" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Membres" value={stats.totalUsers} icon={Users} accent="primary" trend={{ value: `+${stats.newUsersToday} aujourd'hui`, direction: 'up' }} onClick={() => onNavigate('users')} />
          <StatTile label="En ligne" value={stats.onlineUsers} icon={Activity} accent="emerald" pulse trend={{ value: `${onlinePercent}%`, direction: 'neutral' }} />
          <StatTile label="Vérifiés" value={stats.verifiedUsers} icon={Shield} accent="blue" trend={{ value: `${verifiedPercent}%`, direction: 'up' }} onClick={() => onNavigate('verification')} />
          <StatTile label="Conversations" value={stats.totalConversations} icon={MessageSquare} accent="violet" />
        </div>
      </section>

      {/* Secondary KPIs */}
      <section className="animate-fade-in" style={{ animationDelay: '120ms' }}>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <MiniKPI label="Messages total" value={stats.totalMessages} icon={MessageSquare} />
          <MiniKPI label="Msg aujourd'hui" value={stats.messagesToday} icon={Clock} />
          <MiniKPI label="Msg / semaine" value={stats.messagesWeek} icon={BarChart3} />
          <MiniKPI label="Photos" value={stats.totalPhotos} icon={Image} />
          <MiniKPI label="Albums" value={stats.totalAlbums} icon={Hash} />
          <MiniKPI label="Conversations" value={stats.totalConversations} icon={Wallet} />
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 bg-card/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-500" />
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
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', backdropFilter: 'blur(8px)' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#signupGrad)" name="Inscriptions" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between px-2 mt-1">
              <span className="text-xs text-muted-foreground">Semaine: <strong className="text-foreground">+{stats.newUsersWeek}</strong></span>
              <span className="text-xs text-muted-foreground">Mois: <strong className="text-foreground">+{stats.newUsersMonth}</strong></span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Top départements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.topRegions} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Membres">
                  {stats.topRegions.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 bg-card/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Derniers inscrits
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary" onClick={() => onNavigate('users')}>
                Voir tout <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2.5">
              {stats.recentUsers.slice(0, 6).map((user: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground bg-gradient-to-br from-primary/10 to-accent/10">
                        {(user.username || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{user.username || 'Sans nom'}</span>
                      {user.is_verified && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                      {user.is_online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Dép. {user.region} · {format(new Date(user.created_at), 'dd/MM HH:mm')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Activité modération
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
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
                          <span className="text-[10px] text-muted-foreground">{format(new Date(task.created_at), 'dd/MM HH:mm')}</span>
                          <Badge variant="secondary" className={cn(
                            "text-[9px] h-4 px-1.5",
                            task.status === 'completed' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            task.status === 'pending' && "bg-orange-500/10 text-orange-600 border-orange-500/20",
                            task.status === 'reserved' && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          )}>
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
      <Card className="border-border/30 bg-card/70 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Santé de la plateforme
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HealthMetric label="Taux en ligne" value={onlinePercent} suffix="%" color={onlinePercent > 20 ? 'green' : onlinePercent > 5 ? 'orange' : 'red'} />
            <HealthMetric label="Taux vérification" value={verifiedPercent} suffix="%" color={verifiedPercent > 60 ? 'green' : verifiedPercent > 30 ? 'orange' : 'red'} />
            <HealthMetric label="Msg / utilisateur" value={stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0} color="blue" />
            <HealthMetric label="Tâches en attente" value={stats.pendingTasks} color={stats.pendingTasks === 0 ? 'green' : stats.pendingTasks < 5 ? 'orange' : 'red'} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      {isAdmin && (
        <section className="animate-fade-in">
          <AdminSectionHeader eyebrow="Raccourcis" title="Accès rapide" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {([
              { id: 'users' as AdminSection, label: 'Utilisateurs', icon: Users, accent: 'primary' as const },
              { id: 'credits-surveillance' as AdminSection, label: 'Crédits', icon: TrendingUp, accent: 'emerald' as const },
              { id: 'moderators' as AdminSection, label: 'Équipe', icon: Eye, accent: 'violet' as const },
              { id: 'broadcast' as AdminSection, label: 'Broadcast', icon: Globe, accent: 'blue' as const },
              { id: 'maintenance' as AdminSection, label: 'Maintenance', icon: Shield, accent: 'orange' as const },
              { id: 'stats' as AdminSection, label: 'Analytics', icon: BarChart3, accent: 'primary' as const },
            ]).map((item) => (
              <ActionTile
                key={item.id}
                label={item.label}
                icon={item.icon}
                accent={item.accent}
                variant="quick"
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, trend, pulse, onClick }: {
  title: string; value: number; trend?: string; icon: React.ElementType; pulse?: boolean; onClick?: () => void;
}) => (
  <Card
    className={cn(
      "overflow-hidden border-border/30 bg-card/70 backdrop-blur-sm transition-all shadow-sm",
      onClick && "cursor-pointer hover:shadow-md hover:border-border/50 active:scale-[0.98]"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/8 backdrop-blur-sm flex items-center justify-center">
          {pulse ? (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_hsl(142_76%_36%/0.4)]" />
          ) : (
            <Icon className="w-4 h-4 text-primary/70" />
          )}
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight">{value.toLocaleString()}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{title}</span>
        {trend && <span className="text-[10px] text-muted-foreground">{trend}</span>}
      </div>
    </CardContent>
  </Card>
);

const MiniKPI = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl border border-border/25 bg-card/50 backdrop-blur-sm">
    <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />
    <span className="text-base font-display font-bold">{value.toLocaleString()}</span>
    <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

const HealthMetric = ({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) => {
  const colorMap: Record<string, string> = { green: 'text-emerald-500', orange: 'text-orange-500', red: 'text-red-500', blue: 'text-blue-500' };
  return (
    <div className="text-center space-y-2">
      <p className={cn("text-2xl font-display font-bold", colorMap[color])}>{value}{suffix}</p>
      <Progress value={Math.min(value, 100)} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

const HeroPill = ({ label, value, dotClass, pulse }: { label: string; value: number | string; dotClass: string; pulse?: boolean }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-sm">
    <span className={cn('w-2 h-2 rounded-full', dotClass, pulse && 'animate-pulse')} />
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</span>
      <span className="text-sm font-display font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  </div>
);

export default AdminDashboard;
