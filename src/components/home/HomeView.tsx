import { useAuth } from '@/contexts/AuthContext';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Users, MessageCircle, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesMembers from './FavoritesMembers';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface HomeViewProps {
  onNavigateToGroups: () => void;
  onNavigateToMessages: () => void;
  onSelectRegion: (regionCode: string) => void;
  onViewProfile?: (userId: string) => void;
  onStartPrivateChat?: (userId: string) => void;
}

const HomeView = ({ 
  onNavigateToGroups, 
  onNavigateToMessages, 
  onSelectRegion,
  onViewProfile,
  onStartPrivateChat 
}: HomeViewProps) => {
  const { profile } = useAuth();
  const { data: rooms } = useChatRooms();
  const { data: onlineCounts } = useOnlineMemberCounts();
  const { getTotalUnreadCount } = useUnreadMessages();

  // Get total online users
  const totalOnline = Object.values(onlineCounts || {}).reduce((sum, count) => sum + count, 0);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const handleViewProfile = (userId: string) => {
    onViewProfile?.(userId);
  };

  const handleStartChat = (userId: string) => {
    onStartPrivateChat?.(userId);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Compact Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* User info - compact */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-primary/30">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                  {profile?.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">{greeting()}</p>
                <h1 className="font-display text-base font-bold text-foreground leading-tight">
                  {profile?.username || 'Bienvenue'}
                </h1>
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center gap-1">
              {/* Online count badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">{totalOnline}</span>
              </div>
              <ThemeToggle />
              <NotificationsDropdown />
              {getTotalUnreadCount() > 0 && (
                <button 
                  onClick={onNavigateToMessages}
                  className="relative p-2 rounded-lg bg-secondary/80 hover:bg-secondary transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {getTotalUnreadCount() > 9 ? '9+' : getTotalUnreadCount()}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-5">
        {/* Quick Access Buttons - Simplified */}
        <div className="flex gap-2">
          <button
            onClick={onNavigateToGroups}
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <Users className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">{rooms?.length || 0} Groupes</span>
          </button>
          <button
            onClick={onNavigateToMessages}
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors relative"
          >
            <MessageCircle className="w-5 h-5 text-accent" />
            <span className="font-medium text-sm">Messages</span>
            {getTotalUnreadCount() > 0 && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {getTotalUnreadCount()}
              </span>
            )}
          </button>
        </div>

        {/* Favorites Section */}
        <FavoritesMembers onStartChat={handleStartChat} />

        {/* Nearby Members Section - Like Grindr */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-foreground text-sm">À proximité</h2>
          </div>
          
          <NearbyMembersGrid 
            onViewProfile={handleViewProfile}
            onStartChat={handleStartChat}
          />
        </div>
      </div>
    </div>
  );
};

export default HomeView;
