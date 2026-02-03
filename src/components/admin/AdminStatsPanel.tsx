import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart3,
  Users,
  MessageSquare,
  Image,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  UserPlus,
  Eye,
  Clock,
  Globe,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  verifiedUsers: number;
  premiumUsers: number;
  totalMessages: number;
  totalPhotos: number;
  totalAlbums: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  messagesThisWeek: number;
  regionStats: { region: string; count: number }[];
}

const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<Stats> => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Online users
      const { count: onlineUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true);

      // Verified users
      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      // Premium users
      const { count: premiumUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium', true);

      // Total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Total photos
      const { count: totalPhotos } = await supabase
        .from('profile_photos')
        .select('*', { count: 'exact', head: true });

      // Total albums
      const { count: totalAlbums } = await supabase
        .from('user_albums')
        .select('*', { count: 'exact', head: true });

      // New users today
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday);

      // New users this week
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Messages this week
      const { count: messagesThisWeek } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Region stats
      const { data: regionData } = await supabase
        .from('profiles')
        .select('region');

      const regionCounts: Record<string, number> = {};
      regionData?.forEach(p => {
        regionCounts[p.region] = (regionCounts[p.region] || 0) + 1;
      });

      const regionStats = Object.entries(regionCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalMessages: totalMessages || 0,
        totalPhotos: totalPhotos || 0,
        totalAlbums: totalAlbums || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        messagesThisWeek: messagesThisWeek || 0,
        regionStats,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

const AdminStatsPanel = () => {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const onlinePercentage = stats.totalUsers > 0 
    ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) 
    : 0;

  const verifiedPercentage = stats.totalUsers > 0 
    ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Statistiques</h2>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de la plateforme
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Utilisateurs"
          value={stats.totalUsers}
          icon={Users}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          title="En ligne"
          value={stats.onlineUsers}
          icon={Activity}
          color="text-green-500"
          bgColor="bg-green-500/10"
          subtitle={`${onlinePercentage}% des utilisateurs`}
        />
        <StatCard
          title="Vérifiés"
          value={stats.verifiedUsers}
          icon={Shield}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          subtitle={`${verifiedPercentage}% des utilisateurs`}
        />
        <StatCard
          title="Premium"
          value={stats.premiumUsers}
          icon={TrendingUp}
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Messages totaux"
          value={stats.totalMessages}
          icon={MessageSquare}
          color="text-indigo-500"
          bgColor="bg-indigo-500/10"
        />
        <StatCard
          title="Photos de profil"
          value={stats.totalPhotos}
          icon={Image}
          color="text-pink-500"
          bgColor="bg-pink-500/10"
        />
        <StatCard
          title="Albums"
          value={stats.totalAlbums}
          icon={Image}
          color="text-violet-500"
          bgColor="bg-violet-500/10"
        />
        <StatCard
          title="Messages (7j)"
          value={stats.messagesThisWeek}
          icon={Clock}
          color="text-cyan-500"
          bgColor="bg-cyan-500/10"
        />
      </div>

      {/* Growth Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" />
              Croissance utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Aujourd'hui</span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                +{stats.newUsersToday}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cette semaine</span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                +{stats.newUsersThisWeek}
              </Badge>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progression</span>
                <span>{stats.newUsersThisWeek} / 100 objectif</span>
              </div>
              <Progress value={Math.min((stats.newUsersThisWeek / 100) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Top régions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.regionStats.slice(0, 5).map((region, index) => (
                <div key={region.region} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-sm truncate">{region.region}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {region.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activité en temps réel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-green-500/20 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.onlineUsers}</p>
              <p className="text-xs text-muted-foreground">En ligne maintenant</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-blue-500/20 mb-2">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{verifiedPercentage}%</p>
              <p className="text-xs text-muted-foreground">Taux de vérification</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-amber-500/20 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Taux premium</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-indigo-500/20 mb-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Msg/utilisateur</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subtitle?: string;
}) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminStatsPanel;
