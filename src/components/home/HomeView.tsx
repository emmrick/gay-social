import { MapPin } from 'lucide-react';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesMembers from './FavoritesMembers';
import ReferralBanner from './ReferralBanner';

interface HomeViewProps {
  onViewProfile?: (userId: string) => void;
  onStartPrivateChat?: (userId: string) => void;
}

const HomeView = ({ 
  onViewProfile,
  onStartPrivateChat 
}: HomeViewProps) => {
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
        {/* Referral Banner */}
        <ReferralBanner />

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
