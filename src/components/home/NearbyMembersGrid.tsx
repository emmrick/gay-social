import { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, RefreshCw, Users, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { useProfilesByRegion } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ProfileCard from './ProfileCard';

interface NearbyMembersGridProps {
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
  ageRange?: [number, number];
}

const PROFILES_PER_PAGE = 12;

const ProfileSkeleton = ({ index }: { index: number }) => (
  <div
    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card/50 border border-border/20"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <Skeleton className="absolute inset-0" />
    <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1.5">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

const NearbyMembersGrid = ({ onViewProfile, onStartChat, ageRange }: NearbyMembersGridProps) => {
  const { profile: currentUserProfile } = useAuth();
  const { latitude, longitude, loading: locationLoading, requestLocation, permissionState } = useGeolocation();
  const {
    data: nearbyProfiles,
    isLoading: nearbyLoading,
    isFetching: nearbyFetching,
    error: nearbyError,
    refetch: refetchNearby,
    hasGeoData,
  } = useNearbyProfiles(latitude, longitude);
  const {
    data: regionProfiles,
    isLoading: regionLoading,
    refetch: refetchRegion,
  } = useProfilesByRegion(currentUserProfile?.region || '');

  const hasLocation = latitude != null && longitude != null;
  const [visibleCount, setVisibleCount] = useState(PROFILES_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (permissionState === 'granted' && !hasLocation && !locationLoading) {
      void requestLocation();
    }
  }, [permissionState, hasLocation, locationLoading, requestLocation]);

  const prevKeyRef = useRef('');
  const [stableUser, setStableUser] = useState<any>(null);

  useEffect(() => {
    if (!currentUserProfile) return;
    const key = `${currentUserProfile.user_id}|${currentUserProfile.avatar_url}|${currentUserProfile.username}`;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setStableUser({
        id: currentUserProfile.id,
        user_id: currentUserProfile.user_id,
        username: currentUserProfile.username,
        avatar_url: currentUserProfile.avatar_url,
        age: currentUserProfile.age,
        is_online: currentUserProfile.is_online,
        last_seen: currentUserProfile.last_seen,
        bio: currentUserProfile.bio,
        region: currentUserProfile.region,
        created_at: (currentUserProfile as any).created_at,
      });
    }
  }, [currentUserProfile]);

  const fallbackRegionProfiles = useMemo(
    () => (regionProfiles || []).filter(p => p.user_id !== currentUserProfile?.user_id),
    [regionProfiles, currentUserProfile?.user_id]
  );

  const displayProfiles = useMemo(() => {
    if (nearbyProfiles && nearbyProfiles.length > 0) return nearbyProfiles;
    return fallbackRegionProfiles;
  }, [nearbyProfiles, fallbackRegionProfiles]);

  const allProfiles = useMemo(() => {
    const result: any[] = [];
    if (stableUser) {
      result.push({ ...stableUser, distance_km: null, isCurrentUser: true });
    }
    displayProfiles.forEach(p => {
      result.push({ ...p, isCurrentUser: false });
    });
    if (ageRange && (ageRange[0] !== 18 || ageRange[1] !== 99)) {
      return result.filter(p => {
        if (p.isCurrentUser) return true;
        if (!p.age) return false;
        return p.age >= ageRange[0] && p.age <= ageRange[1];
      });
    }
    return result;
  }, [stableUser, displayProfiles, ageRange]);

  const externalProfilesCount = allProfiles.filter(p => !p.isCurrentUser).length;
  const isRefreshing = nearbyFetching || (externalProfilesCount === 0 && regionLoading);

  const handleRefresh = useCallback(async () => {
    setVisibleCount(PROFILES_PER_PAGE);
    try {
      await requestLocation();
    } catch {
      // ignore geolocation refusal, fallback régional restera utilisé
    }
    await Promise.all([refetchNearby(), refetchRegion()]);
  }, [requestLocation, refetchNearby, refetchRegion]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < allProfiles.length) {
          setVisibleCount(prev => Math.min(prev + PROFILES_PER_PAGE, allProfiles.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, allProfiles.length]);

  useEffect(() => {
    setVisibleCount(PROFILES_PER_PAGE);
  }, [ageRange]);

  const visibleProfiles = allProfiles.slice(0, visibleCount);
  const hasMore = visibleCount < allProfiles.length;
  const totalCount = allProfiles.length;
  const onlineCount = allProfiles.filter(p => !p.isCurrentUser && p.is_online).length;

  if (nearbyError && externalProfilesCount === 0 && fallbackRegionProfiles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border/30 p-8 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-6 h-6 text-destructive" />
        </div>
        <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Impossible de charger</h3>
        <p className="text-sm text-muted-foreground mb-5">Vérifie ta connexion et réessaie.</p>
        <Button
          variant="outline"
          className="rounded-xl border-primary/20 hover:bg-primary/5"
          onClick={() => void handleRefresh()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </Button>
      </motion.div>
    );
  }

  if ((nearbyLoading || (externalProfilesCount === 0 && regionLoading)) && externalProfilesCount === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">Recherche de profils…</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <ProfileSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">
              {totalCount} membre{totalCount > 1 ? 's' : ''}
            </span>
          </div>
          {onlineCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {onlineCount} en ligne
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleRefresh()}
          className="text-xs h-8 gap-1.5 rounded-xl hover:bg-primary/5 hover:text-primary"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {hasGeoData && nearbyProfiles && nearbyProfiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10"
        >
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Profils triés par proximité — découvre qui est autour de toi !
          </p>
        </motion.div>
      )}

      {visibleProfiles.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {visibleProfiles.map((profile, index) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                index={index}
                onViewProfile={onViewProfile}
                onLike={onStartChat}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 rounded-2xl bg-card border border-border/30"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Aucun membre trouvé</h3>
          <p className="text-sm text-muted-foreground">Élargis tes filtres pour découvrir plus de profils</p>
        </motion.div>
      )}
    </div>
  );
};

export default memo(NearbyMembersGrid);
