import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Navigation, RefreshCw, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { useAuth } from '@/contexts/AuthContext';

import { shouldShowOnlineIndicator, getLastSeenText } from '@/hooks/useOnlineStatus';

import { cn } from '@/lib/utils';

interface NearbyMembersGridProps {
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
  ageRange?: [number, number];
}

// Skeleton component for loading state
const ProfileSkeleton = ({ index }: { index: number }) => (
  <div 
    className="relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary/50"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <Skeleton className="absolute inset-0" />
    <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

const NearbyMembersGrid = ({ onViewProfile, onStartChat, ageRange }: NearbyMembersGridProps) => {
  const navigate = useNavigate();
  const { profile: currentUserProfile } = useAuth();
  const { latitude, longitude, loading: locationLoading, error: locationError, requestLocation, permissionState } = useGeolocation();
  const { 
    data: profiles, 
    isLoading: profilesLoading, 
    error: profilesError, 
    refetch, 
    isPremium,
    hasGeoData,
  } = useNearbyProfiles(latitude, longitude);

  const hasLocation = latitude != null && longitude != null;

  // If the user already granted location permission, fetch location automatically on mount
  useEffect(() => {
    if (permissionState === 'granted' && !hasLocation && !locationLoading) {
      void requestLocation();
    }
  }, [permissionState, hasLocation, locationLoading, requestLocation]);

  // Build the final profiles list with current user first
  const allProfiles = useMemo(() => {
    const result: any[] = [];
    
    // Add current user profile first
    if (currentUserProfile) {
      result.push({
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
        result.push({
          ...p,
          sexual_position: null,
          isCurrentUser: false,
        });
      });
    }
    
    // Apply age filter
    if (ageRange && (ageRange[0] !== 18 || ageRange[1] !== 99)) {
      return result.filter(p => {
        if (p.isCurrentUser) return true; // Always show current user
        if (!p.age) return false; // Hide profiles without age when filter is active
        return p.age >= ageRange[0] && p.age <= ageRange[1];
      });
    }
    
    return result;
  }, [currentUserProfile, profiles, ageRange]);

  // ---------- HELPER FUNCTIONS ----------

  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getProfileLastSeenText = (profile: any) => getLastSeenText(profile);
  const shouldShowOnlineStatus = (profile: any) => shouldShowOnlineIndicator(profile);

  // ---------- EARLY RETURNS (AFTER ALL HOOKS) ----------

  // Show query error only if no profiles at all
  if (profilesError && allProfiles.length === 0) {
    const message = (profilesError as any)?.message || 'Erreur lors du chargement des profils.';
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-secondary/50 border border-border/50 p-6 text-center"
      >
        <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium text-foreground mb-2">Chargement impossible</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button
          variant="outline"
          onClick={() => {
            void requestLocation();
            void refetch();
          }}
        >
          Réessayer
        </Button>
      </motion.div>
    );
  }

  // Initial loading state - show skeleton grid
  if (profilesLoading && allProfiles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProfileSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {allProfiles.filter(p => !p.isCurrentUser).length} membre{allProfiles.filter(p => !p.isCurrentUser).length > 1 ? 's' : ''}{hasGeoData ? ' à proximité' : ''}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            void requestLocation();
            void refetch();
          }}
          className="text-xs"
          disabled={profilesLoading}
        >
          <RefreshCw className={cn("w-3 h-3 mr-1", profilesLoading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Members grid */}
      {allProfiles.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {allProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => !profile.isCurrentUser && navigate(`/profile/${profile.user_id}`)}
                className={cn(
                  "relative aspect-[3/4] rounded-xl overflow-hidden group",
                  "bg-gradient-to-br from-secondary to-secondary/50",
                  "border-2 transition-colors duration-150",
                  profile.isCurrentUser 
                    ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30" 
                    : "border-border/30 active:border-primary/50"
                )}
              >
                {/* Avatar/Photo */}
                <div className="absolute inset-0">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.username}
                      loading="lazy"
                      decoding="async"
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
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1 z-10">
                    <Crown className="w-3 h-3" />
                    Toi
                  </div>
                )}


                {/* Online/Offline indicator */}
                {!profile.isCurrentUser && (
                  <div className="absolute top-2 right-2">
                    {shouldShowOnlineStatus(profile) ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-lg shadow-green-500/50" />
                    ) : !profile.hide_online_status ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400 block" />
                    ) : null}
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
                    ) : (
                      <span>{getProfileLastSeenText(profile)}</span>
                    )}
                  </div>
                </div>

                {/* Proximity badge */}
                {!profile.isCurrentUser && profile.distance_km !== null && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {formatDistance(profile.distance_km)}
                  </div>
                )}

                {/* Hover effect */}
                {!profile.isCurrentUser && (
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>
            ))}
          </div>

        </>
      ) : (
        <div className="text-center py-12 rounded-2xl bg-secondary/30">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun membre à proximité</p>
        </div>
      )}
    </div>
  );
};

export default NearbyMembersGrid;
