import { useAuth } from '@/contexts/AuthContext';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Users, MessageCircle, MapPin } from 'lucide-react';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesMembers from './FavoritesMembers';

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
  const { data: rooms } = useChatRooms();
  const { getTotalUnreadCount } = useUnreadMessages();

  const handleViewProfile = (userId: string) => {
    onViewProfile?.(userId);
  };

  const handleStartChat = (userId: string) => {
    onStartPrivateChat?.(userId);
  };

  return (
    <div className="pb-4">
      {/* Main Content */}
      <div className="px-4 py-4 space-y-5">
        {/* Quick Access Buttons - Simplified */}
        <div className="flex gap-2">
          <button
            onClick={onNavigateToGroups}
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors touch-feedback"
          >
            <Users className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-medium text-sm truncate">{rooms?.length || 0} Groupes</span>
          </button>
          <button
            onClick={onNavigateToMessages}
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors relative touch-feedback"
          >
            <MessageCircle className="w-5 h-5 text-accent flex-shrink-0" />
            <span className="font-medium text-sm truncate">Messages</span>
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
