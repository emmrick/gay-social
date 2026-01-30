import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Navigation, RefreshCw, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { shouldShowOnlineIndicator, getLastSeenText } from '@/hooks/useOnlineStatus';
import PremiumUserBadge from '@/components/premium/PremiumUserBadge';
import { cn } from '@/lib/utils';

interface NearbyMembersGridProps {
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
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

const NearbyMembersGrid = ({ onViewProfile, onStartChat }: NearbyMembersGridProps) => {
  const navigate = useNavigate();
  const { profile: currentUserProfile } = useAuth();
  const { latitude, longitude, loading: locationLoading, error: locationError, requestLocation, permissionState } = useGeolocation();
  const { 
    data: profiles, 
    isLoading: profilesLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: profilesError, 
    refetch, 
    maxProfilesAllowed, 
    isPremium, 
    isLimited 
  } = useNearbyProfiles(latitude, longitude);

  const hasLocation = latitude != null && longitude != null;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    
    return result;
  }, [currentUserProfile, profiles]);

  // Get user IDs for premium check - stable dependency
  const userIds = useMemo(() => allProfiles.map(p => p.user_id), [allProfiles]);
  const { data: premiumMap = {} } = usePremiumUsers(userIds);

  // ---------- HELPER FUNCTIONS ----------

  const handleRequestLocation = async () => {
    await requestLocation();
  };

  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // Use centralized online status helpers
  const getProfileLastSeenText = (profile: any) => {
    return getLastSeenText(profile);
  };
  
  const shouldShowOnlineStatus = (profile: any) => {
    return shouldShowOnlineIndicator(profile);
  };

  // ---------- EARLY RETURNS (AFTER ALL HOOKS) ----------

  // Show location permission request
  if (!hasLocation && !locationLoading && (permissionState === 'prompt' || !permissionState)) {
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

  // If permission is already granted, wait for coordinates
  if (!hasLocation && permissionState === 'granted' && !locationError) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <ProfileSkeleton key={i} index={i} />
        ))}
      </div>
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

  // Show query error
  if (profilesError) {
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
  if (locationLoading || (profilesLoading && allProfiles.length === 0)) {
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
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {allProfiles.length} membres{hasLocation ? ' à proximité' : ''}
          </span>
          {!isPremium && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              max {maxProfilesAllowed}
            </span>
          )}
        </div>
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

      {/* Limit warning */}
      {isLimited && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex items-center gap-2"
        >
          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-amber-600 dark:text-amber-400 flex-1">
            Tu vois {maxProfilesAllowed} profils max. Passe Premium pour voir tous les membres !
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2 flex-shrink-0"
            onClick={() => window.location.href = '/?tab=premium'}
          >
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Button>
        </motion.div>
      )}

      {/* Members grid */}
      {allProfiles.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {allProfiles.map((profile, index) => (
              <motion.button
                key={profile.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }} // Cap animation delay
                onClick={() => !profile.isCurrentUser && navigate(`/profile/${profile.user_id}`)}
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
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Toi
                  </div>
                )}

                {/* Premium badge */}
                {!profile.isCurrentUser && premiumMap[profile.user_id] && (
                  <div className="absolute top-2 left-2">
                    <PremiumUserBadge size="sm" />
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
                    ) : profile.distance_km !== null ? (
                      <>
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{formatDistance(profile.distance_km)}</span>
                      </>
                    ) : (
                      <span>{getProfileLastSeenText(profile)}</span>
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

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="py-2">
            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Chargement...</span>
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                className="w-full text-xs"
              >
                Voir plus de membres
              </Button>
            )}
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
