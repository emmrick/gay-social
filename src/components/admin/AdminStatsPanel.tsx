import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart3, Users, MessageSquare, Image, Shield, TrendingUp,
  Activity, UserPlus, Globe, Crown, Clock, Hash, Wallet,
  Heart, Eye, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const useDetailedStats = () => {
  return useQuery({
    queryKey: ['admin-detailed-stats'],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();
      const monthAgo = subDays(today, 30).toISOString();

      const countQuery = (table: string, filters?: Record<string, any>, gte?: { col: string; val: string }) => {
        let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
        if (filters) Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v) as any; });
        if (gte) q = q.gte(gte.col, gte.val) as any;
        return q as any;
      };

      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        countQuery('profiles'),
        countQuery('profiles', { is_online: true }),
        countQuery('profiles', { is_verified: true }),
        countQuery('profiles', { is_premium: true }),
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
      const premiumUsers = r4.count || 0;
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

      // Daily signups chart (14 days)
      const signupMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        signupMap[format(subDays(today, i), 'dd/MM')] = 0;
      }
      dailySignupsData?.forEach((p: any) => {
        const key = format(new Date(p.created_at), 'dd/MM');
        if (signupMap[key] !== undefined) signupMap[key]++;
      });
      const signupChart = Object.entries(signupMap).map(([date, count]) => ({ date, inscriptions: count }));

      // Daily messages chart (7 days)
      const msgMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        msgMap[format(subDays(today, i), 'EEE', { locale: fr })] = 0;
      }
      dailyMessagesData?.forEach((m: any) => {
        const key = format(new Date(m.created_at), 'EEE', { locale: fr });
        if (msgMap[key] !== undefined) msgMap[key]++;
      });
      const messageChart = Object.entries(msgMap).map(([day, count]) => ({ day, messages: count }));

      // Region stats
      const regionCounts: Record<string, number> = {};
      regionData?.forEach((p: any) => {
        if (p.region) regionCounts[p.region] = (regionCounts[p.region] || 0) + 1;
      });
      const topRegions = Object.entries(regionCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Verification status breakdown
      const verificationBreakdown: Record<string, number> = {};
      verificationStatusData?.forEach((v: any) => {
        verificationBreakdown[v.status] = (verificationBreakdown[v.status] || 0) + 1;
      });

      return {
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalMessages: totalMessages || 0,
        messagesWeek: messagesWeek || 0,
        messagesToday: messagesToday || 0,
        totalPhotos: totalPhotos || 0,
        totalAlbums: totalAlbums || 0,
        totalConversations: totalConversations || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        newUsersMonth: newUsersMonth || 0,
        totalReports: totalReports || 0,
        pendingReports: pendingReports || 0,
        totalVerifications: totalVerifications || 0,
        approvedVerifications: approvedVerifications || 0,
        completedTasks: completedTasks || 0,
        totalSwipeLikes: totalSwipeLikes || 0,
        totalGifts: totalGifts || 0,
        topRegions,
        signupChart,
        messageChart,
        verificationBreakdown,
      };
    },
    refetchInterval: 60000,
  });
};

const COLORS = [
  'hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(220, 70%, 55%)',
  'hsl(280, 60%, 55%)', 'hsl(340, 65%, 55%)', 'hsl(30, 70%, 55%)',
  'hsl(190, 70%, 45%)', 'hsl(60, 70%, 45%)', 'hsl(0, 70%, 55%)', 'hsl(160, 60%, 45%)'
];

const AdminStatsPanel = () => {
  const { data: stats, isLoading } = useDetailedStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const onlinePercent = stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0;
  const verifiedPercent = stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;
  const premiumPercent = stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0;
  const avgMsgPerUser = stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0;

  const verificationPie = [
    { name: 'Approuvées', value: stats.verificationBreakdown['approved'] || 0 },
    { name: 'En attente', value: stats.verificationBreakdown['pending'] || 0 },
    { name: 'Rejetées', value: stats.verificationBreakdown['rejected'] || 0 },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Analytics détaillé</h2>
          <p className="text-sm text-muted-foreground">Données en temps réel de la plateforme</p>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Utilisateurs" value={stats.totalUsers} icon={Users} color="text-primary" bgColor="bg-primary/10" />
        <StatCard title="En ligne" value={stats.onlineUsers} icon={Activity} color="text-green-500" bgColor="bg-green-500/10" subtitle={`${onlinePercent}%`} />
        <StatCard title="Vérifiés" value={stats.verifiedUsers} icon={Shield} color="text-blue-500" bgColor="bg-blue-500/10" subtitle={`${verifiedPercent}%`} />
        <StatCard title="Premium" value={stats.premiumUsers} icon={Crown} color="text-amber-500" bgColor="bg-amber-500/10" subtitle={`${premiumPercent}%`} />
      </div>

      {/* Activity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Messages total" value={stats.totalMessages} icon={MessageSquare} color="text-indigo-500" bgColor="bg-indigo-500/10" />
        <StatCard title="Msg aujourd'hui" value={stats.messagesToday} icon={Clock} color="text-cyan-500" bgColor="bg-cyan-500/10" />
        <StatCard title="Msg / semaine" value={stats.messagesWeek} icon={BarChart3} color="text-violet-500" bgColor="bg-violet-500/10" />
        <StatCard title="Msg / utilisateur" value={avgMsgPerUser} icon={Hash} color="text-teal-500" bgColor="bg-teal-500/10" />
      </div>

      {/* Content & Social KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <MiniStat label="Photos" value={stats.totalPhotos} icon={Image} />
        <MiniStat label="Albums" value={stats.totalAlbums} icon={Hash} />
        <MiniStat label="Conversations" value={stats.totalConversations} icon={Wallet} />
        <MiniStat label="Likes (swipe)" value={stats.totalSwipeLikes} icon={Heart} />
        <MiniStat label="Cadeaux" value={stats.totalGifts} icon={Zap} />
        <MiniStat label="Signalements" value={stats.totalReports} icon={Eye} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signups 14 days */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" />
              Inscriptions (14 jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.signupChart}>
                <defs>
                  <linearGradient id="statsSignupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                <Area type="monotone" dataKey="inscriptions" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#statsSignupGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 px-3 mt-1">
              <span className="text-[10px] text-muted-foreground">Aujourd'hui: <strong className="text-foreground">+{stats.newUsersToday}</strong></span>
              <span className="text-[10px] text-muted-foreground">Semaine: <strong className="text-foreground">+{stats.newUsersWeek}</strong></span>
              <span className="text-[10px] text-muted-foreground">Mois: <strong className="text-foreground">+{stats.newUsersMonth}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Messages 7 days */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Messages (7 jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.messageChart}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Regions */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Top 10 départements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topRegions} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Membres">
                  {stats.topRegions.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification breakdown */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Vérifications d'identité
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={verificationPie} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" stroke="none">
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
                    <span className="text-sm font-bold">{stats.totalVerifications}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Progress */}
      <Card className="border-border/40">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Objectifs de croissance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GrowthGoal label="Inscriptions / semaine" current={stats.newUsersWeek} goal={100} />
            <GrowthGoal label="Inscriptions / mois" current={stats.newUsersMonth} goal={500} />
            <GrowthGoal label="Taux de vérification" current={verifiedPercent} goal={80} suffix="%" />
          </div>
        </CardContent>
      </Card>

      {/* Moderation Stats */}
      <Card className="border-border/40">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            Modération
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tâches terminées</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold">{stats.totalReports}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Signalements total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold text-orange-500">{stats.pendingReports}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">En attente</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-2xl font-bold">{stats.approvedVerifications}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Vérifiés total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle }: {
  title: string; value: number; icon: React.ElementType; color: string; bgColor: string; subtitle?: string;
}) => (
  <Card className="border-border/40">
    <CardContent className="pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const MiniStat = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-border/30 bg-card">
    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-base font-bold">{value.toLocaleString()}</span>
    <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

const GrowthGoal = ({ label, current, goal, suffix = '' }: { label: string; current: number; goal: number; suffix?: string }) => {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{current}{suffix} / {goal}{suffix}</span>
      </div>
      <Progress value={percent} className="h-2" />
      <span className={cn("text-[10px] font-medium", percent >= 100 ? 'text-green-500' : percent >= 50 ? 'text-orange-500' : 'text-red-500')}>
        {percent}% atteint
      </span>
    </div>
  );
};

export default AdminStatsPanel;
