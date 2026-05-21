/**
 * AdminStatsPanel — refonte design system.
 * Analytics complet (KPIs, charts Recharts, top régions, vérifications, croissance).
 * Logique métier 100% conservée (mêmes queries Supabase).
 */
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart3, Users, MessageSquare, Image as ImageIcon, Shield, TrendingUp,
  Activity, UserPlus, Globe, Clock, Hash, Wallet,
  Heart, Eye, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { AdminCard, AdminSectionHeader, StatTile, AdminListSkeleton } from './ui';

const useDetailedStats = () => {
  return useQuery({
    queryKey: ['admin-detailed-stats'],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();
      const monthAgo = subDays(today, 30).toISOString();
      const onlineCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const countQuery = (table: string, filters?: Record<string, any>, gte?: { col: string; val: string }) => {
        let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
        if (filters) Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v) as any; });
        if (gte) q = q.gte(gte.col, gte.val) as any;
        return q as any;
      };

      const onlineQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)
        .gte('last_seen', onlineCutoff);

      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        countQuery('profiles'),
        onlineQuery,
        countQuery('profiles', { is_verified: true }),
        countQuery('credit_transactions'),
        countQuery('messages'),
        countQuery('messages', undefined, { col: 'created_at', val: weekAgo }),
        countQuery('messages', undefined, { col: 'created_at', val: startOfToday }),
        countQuery('profile_photos'),
      ]);

      const [r9, r10, r11, r12, r13, r14, r15, r16] = await Promise.all([
        countQuery('user_albums'),
        countQuery('private_conversations'),
        countQuery('profiles', undefined, { col: 'created_at', val: startOfToday }),
        countQuery('profiles', undefined, { col: 'created_at', val: weekAgo }),
        countQuery('profiles', undefined, { col: 'created_at', val: monthAgo }),
        countQuery('reports'),
        countQuery('reports', { status: 'pending' }),
        countQuery('identity_verifications'),
      ]);

      const [r17, r18, r19, r20] = await Promise.all([
        countQuery('identity_verifications', { status: 'approved' }),
        countQuery('moderation_tasks', { status: 'completed' }),
        countQuery('swipe_actions', { action: 'like' }),
        countQuery('credit_gifts'),
      ]);

      const [r21, r22, r23, r24] = await Promise.all([
        supabase.from('profiles').select('region'),
        supabase.from('profiles').select('created_at').gte('created_at', subDays(today, 14).toISOString()).order('created_at', { ascending: true }),
        supabase.from('messages').select('created_at').gte('created_at', weekAgo).order('created_at', { ascending: true }),
        supabase.from('identity_verifications').select('status'),
      ]);

      const totalUsers = r1.count || 0;
      const onlineUsers = r2.count || 0;
      const verifiedUsers = r3.count || 0;
      const totalCredits = r4.count || 0;
      const totalMessages = r5.count || 0;
      const messagesWeek = r6.count || 0;
      const messagesToday = r7.count || 0;
      const totalPhotos = r8.count || 0;
      const totalAlbums = r9.count || 0;
      const totalConversations = r10.count || 0;
      const newUsersToday = r11.count || 0;
      const newUsersWeek = r12.count || 0;
      const newUsersMonth = r13.count || 0;
      const totalReports = r14.count || 0;
      const pendingReports = r15.count || 0;
      const totalVerifications = r16.count || 0;
      const approvedVerifications = r17.count || 0;
      const completedTasks = r18.count || 0;
      const totalSwipeLikes = r19.count || 0;
      const totalGifts = r20.count || 0;
      const regionData = r21.data;
      const dailySignupsData = r22.data;
      const dailyMessagesData = r23.data;
      const verificationStatusData = r24.data;

      const signupMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        signupMap[format(subDays(today, i), 'dd/MM')] = 0;
      }
      dailySignupsData?.forEach((p: any) => {
        const key = format(new Date(p.created_at), 'dd/MM');
        if (signupMap[key] !== undefined) signupMap[key]++;
      });
      const signupChart = Object.entries(signupMap).map(([date, count]) => ({ date, inscriptions: count }));

      const msgMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        msgMap[format(subDays(today, i), 'EEE', { locale: fr })] = 0;
      }
      dailyMessagesData?.forEach((m: any) => {
        const key = format(new Date(m.created_at), 'EEE', { locale: fr });
        if (msgMap[key] !== undefined) msgMap[key]++;
      });
      const messageChart = Object.entries(msgMap).map(([day, count]) => ({ day, messages: count }));

      const regionCounts: Record<string, number> = {};
      regionData?.forEach((p: any) => {
        if (p.region) regionCounts[p.region] = (regionCounts[p.region] || 0) + 1;
      });
      const topRegions = Object.entries(regionCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const verificationBreakdown: Record<string, number> = {};
      verificationStatusData?.forEach((v: any) => {
        verificationBreakdown[v.status] = (verificationBreakdown[v.status] || 0) + 1;
      });

      return {
        totalUsers, onlineUsers, verifiedUsers, newUsersToday, totalMessages,
        messagesWeek, messagesToday, totalPhotos, totalAlbums, totalConversations,
        totalCredits, newUsersWeek, newUsersMonth, totalReports, pendingReports,
        totalVerifications, approvedVerifications, completedTasks, totalSwipeLikes, totalGifts,
        topRegions, signupChart, messageChart, verificationBreakdown,
      };
    },
    refetchInterval: 60000,
  });
};

const REGION_COLORS = [
  'hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(220, 70%, 55%)',
  'hsl(280, 60%, 55%)', 'hsl(340, 65%, 55%)', 'hsl(30, 70%, 55%)',
  'hsl(190, 70%, 45%)', 'hsl(60, 70%, 45%)', 'hsl(0, 70%, 55%)', 'hsl(160, 60%, 45%)',
];
const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const tooltipStyle: React.CSSProperties = {
  fontSize: 12,
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 8px 24px -4px hsl(0 0% 0% / 0.15)',
};

const AdminStatsPanel = () => {
  const { data: stats, isLoading } = useDetailedStats();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
        <AdminListSkeleton count={3} />
      </div>
    );
  }

  if (!stats) return null;

  const onlinePercent = stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0;
  const verifiedPercent = stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;
  const avgMsgPerUser = stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0;

  const verificationPie = [
    { name: 'Approuvées', value: stats.verificationBreakdown['approved'] || 0 },
    { name: 'En attente', value: stats.verificationBreakdown['pending'] || 0 },
    { name: 'Rejetées', value: stats.verificationBreakdown['rejected'] || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={BarChart3}
        eyebrow="Vue d'ensemble"
        title="Analytics détaillé"
      />

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Utilisateurs" value={stats.totalUsers} icon={Users} accent="primary" />
        <StatTile
          label="En ligne"
          value={stats.onlineUsers}
          icon={Activity}
          accent="emerald"
          trend={{ value: `${onlinePercent}%`, direction: 'neutral' }}
          pulse
        />
        <StatTile
          label="Vérifiés"
          value={stats.verifiedUsers}
          icon={Shield}
          accent="blue"
          trend={{ value: `${verifiedPercent}%`, direction: 'neutral' }}
        />
        <StatTile label="Nouveaux (jour)" value={stats.newUsersToday} icon={Clock} accent="orange" />
      </div>

      {/* Activity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Messages total" value={stats.totalMessages} icon={MessageSquare} accent="violet" />
        <StatTile label="Msg aujourd'hui" value={stats.messagesToday} icon={Clock} accent="blue" />
        <StatTile label="Msg / semaine" value={stats.messagesWeek} icon={BarChart3} accent="violet" />
        <StatTile label="Msg / utilisateur" value={avgMsgPerUser} icon={Hash} accent="primary" />
      </div>

      {/* Mini stats grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <MiniStat label="Photos" value={stats.totalPhotos} icon={ImageIcon} />
        <MiniStat label="Albums" value={stats.totalAlbums} icon={Hash} />
        <MiniStat label="Conversations" value={stats.totalConversations} icon={Wallet} />
        <MiniStat label="Likes (swipe)" value={stats.totalSwipeLikes} icon={Heart} />
        <MiniStat label="Cadeaux" value={stats.totalGifts} icon={Zap} />
        <MiniStat label="Signalements" value={stats.totalReports} icon={Eye} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          icon={UserPlus}
          iconClass="text-emerald-500"
          title="Inscriptions (14 jours)"
          footer={
            <div className="flex gap-4 px-1 mt-1">
              <FootMetric label="Aujourd'hui" value={`+${stats.newUsersToday}`} />
              <FootMetric label="Semaine" value={`+${stats.newUsersWeek}`} />
              <FootMetric label="Mois" value={`+${stats.newUsersMonth}`} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.signupChart}>
              <defs>
                <linearGradient id="statsSignupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Area type="monotone" dataKey="inscriptions" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#statsSignupGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={MessageSquare} iconClass="text-violet-500" title="Messages (7 jours)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.messageChart}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard icon={Globe} iconClass="text-blue-500" title="Top 10 départements">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.topRegions} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Membres">
                {stats.topRegions.map((_, i) => (
                  <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Shield} iconClass="text-blue-500" title="Vérifications d'identité">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={verificationPie} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" stroke="none">
                  {verificationPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {verificationPie.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-xs">{item.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{item.value}</Badge>
                </div>
              ))}
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-sm font-bold tabular-nums">{stats.totalVerifications}</span>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Growth Goals */}
      <AdminCard padding="md">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-display font-semibold">Objectifs de croissance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GrowthGoal label="Inscriptions / semaine" current={stats.newUsersWeek} goal={100} />
          <GrowthGoal label="Inscriptions / mois" current={stats.newUsersMonth} goal={500} />
          <GrowthGoal label="Taux de vérification" current={verifiedPercent} goal={80} suffix="%" />
        </div>
      </AdminCard>

      {/* Moderation block */}
      <AdminCard padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-orange-500" />
          <p className="text-sm font-display font-semibold">Modération</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="Tâches terminées" value={stats.completedTasks} />
          <MiniStat label="Signalements total" value={stats.totalReports} />
          <MiniStat label="En attente" value={stats.pendingReports} valueClass="text-orange-500" />
          <MiniStat label="Vérifiés total" value={stats.approvedVerifications} valueClass="text-emerald-500" />
        </div>
      </AdminCard>
    </div>
  );
};

const ChartCard = ({
  icon: Icon, iconClass, title, children, footer,
}: {
  icon: React.ElementType;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <AdminCard padding="md">
    <div className="flex items-center gap-2 mb-3">
      <Icon className={cn('w-4 h-4', iconClass)} />
      <p className="text-sm font-display font-semibold">{title}</p>
    </div>
    {children}
    {footer}
  </AdminCard>
);

const FootMetric = ({ label, value }: { label: string; value: string }) => (
  <span className="text-[10px] text-muted-foreground">
    {label}: <strong className="text-foreground tabular-nums">{value}</strong>
  </span>
);

const MiniStat = ({
  label, value, icon: Icon, valueClass,
}: {
  label: string;
  value: number;
  icon?: React.ElementType;
  valueClass?: string;
}) => (
  <div className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/40 bg-muted/20">
    {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
    <span className={cn('text-base font-bold tabular-nums', valueClass)}>{value.toLocaleString()}</span>
    <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

const GrowthGoal = ({
  label, current, goal, suffix = '',
}: {
  label: string;
  current: number;
  goal: number;
  suffix?: string;
}) => {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">
          {current}{suffix} / {goal}{suffix}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
      <span
        className={cn(
          'text-[10px] font-medium',
          percent >= 100 ? 'text-emerald-500' : percent >= 50 ? 'text-orange-500' : 'text-red-500',
        )}
      >
        {percent}% atteint
      </span>
    </div>
  );
};

export default AdminStatsPanel;
