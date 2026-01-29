import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Navigation, RefreshCw, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { useAuth } from '@/contexts/AuthContext';
import MemberProfileCard from './MemberProfileCard';
import { cn } from '@/lib/utils';

interface NearbyMembersGridProps {
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
}

const NearbyMembersGrid = ({ onViewProfile, onStartChat }: NearbyMembersGridProps) => {
  const { profile: currentUserProfile } = useAuth();
  const { latitude, longitude, loading: locationLoading, error: locationError, requestLocation, permissionState } = useGeolocation();
  const { data: profiles, isLoading: profilesLoading, refetch } = useNearbyProfiles(latitude, longitude);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleRequestLocation = async () => {
    await requestLocation();
  };

  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getLastSeenText = (lastSeen: string | null, isOnline: boolean | null) => {
    if (isOnline === true) return null;
    if (!lastSeen) return 'Hors ligne';
    
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 5) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}j`;
  };

  // Get position label
  const getPositionLabel = (position: string | null) => {
    if (!position) return null;
    const labels: Record<string, string> = {
      'actif': '🔝 Top',
      'passif': '🔽 Bottom',
      'versatile': '↕️ Vers',
      'vers_top': '↕️🔝 V.Top',
      'vers_bottom': '↕️🔽 V.Btm',
    };
    return labels[position] || null;
  };

  // Show location permission request
  if (!latitude && !locationLoading && (permissionState === 'prompt' || !permissionState)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50 p-6 text-center"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Navigation className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-lg mb-2">
          Découvre les membres proches
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Active ta position pour voir qui est autour de toi
        </p>
        <Button 
          onClick={handleRequestLocation}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          disabled={locationLoading}
        >
          {locationLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Localisation...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Activer la localisation
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  // Show error state
  if (locationError || permissionState === 'denied') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-secondary/50 border border-border/50 p-6 text-center"
      >
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium text-foreground mb-2">Position non disponible</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {locationError || 'Active la géolocalisation dans les paramètres de ton navigateur'}
        </p>
        <Button variant="outline" onClick={handleRequestLocation}>
          Réessayer
        </Button>
      </motion.div>
    );
  }

  // Loading state
  if (locationLoading || profilesLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div 
            key={i} 
            className="aspect-[3/4] rounded-xl bg-secondary/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Build the final profiles list with current user first
  const allProfiles = [];
  
  // Add current user profile first
  if (currentUserProfile) {
    allProfiles.push({
      id: currentUserProfile.id,
      user_id: currentUserProfile.user_id,
      username: currentUserProfile.username,
      avatar_url: currentUserProfile.avatar_url,
      age: currentUserProfile.age,
      is_online: currentUserProfile.is_online,
      last_seen: currentUserProfile.last_seen,
      distance_km: null,
      bio: currentUserProfile.bio,
      region: currentUserProfile.region,
      sexual_position: (currentUserProfile as any).sexual_position,
      isCurrentUser: true,
    });
  }
  
  // Add other profiles
  if (profiles) {
    profiles.forEach(p => {
      allProfiles.push({
        ...p,
        sexual_position: null, // Not returned by nearby profiles query
        isCurrentUser: false,
      });
    });
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {(profiles?.length || 0) + (currentUserProfile ? 1 : 0)} membres{latitude ? ' à proximité' : ''}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            requestLocation();
            refetch();
          }}
          className="text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Actualiser
        </Button>
      </div>

      {/* Members grid */}
      {allProfiles.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {allProfiles.map((profile, index) => (
            <motion.button
              key={profile.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => !profile.isCurrentUser && setSelectedUserId(profile.user_id)}
              className={cn(
                "relative aspect-[3/4] rounded-xl overflow-hidden group",
                "bg-gradient-to-br from-secondary to-secondary/50",
                "border-2 transition-all duration-200",
                profile.isCurrentUser 
                  ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30" 
                  : "border-border/30 hover:border-primary/50"
              )}
            >
              {/* Avatar/Photo */}
              <div className="absolute inset-0">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white/80">
                      {profile.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Current user badge */}
              {profile.isCurrentUser && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Toi
                </div>
              )}

              {/* Online indicator - only show if explicitly true */}
              {profile.is_online === true && !profile.isCurrentUser && (
                <div className="absolute top-2 right-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-lg shadow-green-500/50" />
                </div>
              )}

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-white font-medium text-sm truncate">
                    {profile.username}
                  </span>
                  {profile.age && (
                    <span className="text-white/70 text-xs">{profile.age}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-white/60">
                  {profile.isCurrentUser ? (
                    <span className="text-primary-foreground/80">Voir ton profil</span>
                  ) : profile.distance_km !== null ? (
                    <>
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{formatDistance(profile.distance_km)}</span>
                    </>
                  ) : (
                    <span>{getLastSeenText(profile.last_seen, profile.is_online)}</span>
                  )}
                </div>
              </div>

              {/* Hover effect */}
              {!profile.isCurrentUser && (
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl bg-secondary/30">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun membre à proximité</p>
        </div>
      )}

      {/* Profile preview sheet */}
      {selectedUserId && (
        <MemberProfileCard
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onStartChat={() => {
            onStartChat(selectedUserId);
            setSelectedUserId(null);
          }}
          onViewProfile={() => {
            onViewProfile(selectedUserId);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
};

export default NearbyMembersGrid;
