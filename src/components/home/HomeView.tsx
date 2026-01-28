import { useAuth } from '@/contexts/AuthContext';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Users, MessageCircle, MapPin, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeViewProps {
  onNavigateToGroups: () => void;
  onNavigateToMessages: () => void;
  onSelectRegion: (regionCode: string) => void;
}

const HomeView = ({ onNavigateToGroups, onNavigateToMessages, onSelectRegion }: HomeViewProps) => {
  const { profile } = useAuth();
  const { data: rooms } = useChatRooms();
  const { data: onlineCounts } = useOnlineMemberCounts();
  const { getTotalUnreadCount } = useUnreadMessages();

  // Get total online users
  const totalOnline = Object.values(onlineCounts || {}).reduce((sum, count) => sum + count, 0);
  
  // Get user's region room
  const userRegionRoom = rooms?.find(room => room.region_code === profile?.region);
  const userRegionOnline = profile?.region ? (onlineCounts?.[profile.region] || 0) : 0;

  // Get top 3 active regions
  const topRegions = rooms
    ?.map(room => ({
      ...room,
      onlineCount: onlineCounts?.[room.region_code] || 0
    }))
    .sort((a, b) => b.onlineCount - a.onlineCount)
    .slice(0, 3) || [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="px-4 py-6 pb-28 space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="space-y-1">
        <p className="text-muted-foreground">{greeting()},</p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {profile?.username || 'Bienvenue'} 👋
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          icon={<Users className="w-5 h-5" />}
          value={totalOnline.toString()}
          label="En ligne"
          gradient="from-primary to-accent"
        />
        <StatsCard
          icon={<MessageCircle className="w-5 h-5" />}
          value={getTotalUnreadCount().toString()}
          label="Non lus"
          gradient="from-accent to-primary"
          onClick={onNavigateToMessages}
        />
      </div>

      {/* User's Region Quick Access */}
      {userRegionRoom && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Ta région
          </h2>
          <button
            onClick={() => onSelectRegion(userRegionRoom.region_code)}
            className="w-full glass-card rounded-2xl p-4 text-left hover:border-primary/50 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white text-lg shadow-lg">
                  {userRegionRoom.region_code}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{userRegionRoom.region_name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    {userRegionOnline > 0 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {userRegionOnline} en ligne
                      </>
                    ) : (
                      'Rejoindre le groupe'
                    )}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>
      )}

      {/* Top Active Regions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Régions actives
          </h2>
          <button 
            onClick={onNavigateToGroups}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Voir tout
          </button>
        </div>
        <div className="space-y-2">
          {topRegions.map((room, index) => (
            <button
              key={room.id}
              onClick={() => onSelectRegion(room.region_code)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                "bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center font-display font-semibold text-white text-sm">
                {room.region_code}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-foreground text-sm">{room.region_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {room.onlineCount > 0 ? `${room.onlineCount} en ligne` : 'Aucun membre en ligne'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
          {topRegions.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              Aucune activité pour le moment
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={<Users className="w-5 h-5" />}
          title="Groupes"
          description="Explore les régions"
          onClick={onNavigateToGroups}
        />
        <QuickActionCard
          icon={<MessageCircle className="w-5 h-5" />}
          title="Messages"
          description="Conversations privées"
          onClick={onNavigateToMessages}
          badge={getTotalUnreadCount() > 0 ? getTotalUnreadCount() : undefined}
        />
      </div>
    </div>
  );
};

interface StatsCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  gradient: string;
  onClick?: () => void;
}

const StatsCard = ({ icon, value, label, gradient, onClick }: StatsCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300",
      "bg-gradient-to-br", gradient,
      onClick && "hover:scale-[1.02] active:scale-[0.98]"
    )}
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
    <div className="relative z-10">
      <div className="mb-2 text-white/80">{icon}</div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/70">{label}</p>
    </div>
  </button>
);

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  badge?: number;
}

const QuickActionCard = ({ icon, title, description, onClick, badge }: QuickActionCardProps) => (
  <button
    onClick={onClick}
    className="relative glass-card rounded-xl p-4 text-left hover:border-primary/50 transition-all duration-300 group"
  >
    {badge && (
      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
    <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground mb-0.5">{title}</h3>
    <p className="text-xs text-muted-foreground">{description}</p>
  </button>
);

export default HomeView;
