import { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, RefreshCw, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { getSignedAvatarUrls } from '@/hooks/useAvatarUrl';
import ProfileCard from './ProfileCard';
import GeolocationGate from './GeolocationGate';
import AdBanner from '@/components/ads/AdBanner';
import type { RadiusValue } from './RadiusSelector';
import { recordPerfMetric } from '@/lib/perfMetrics';

interface NearbyMembersGridProps {
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
  ageRange?: [number, number];
  /** Rayon contrôlé par le parent (HomeView) */
  radius: RadiusValue;
  /** Incrémenté par le parent pour déclencher un refresh */
  refreshToken?: number;
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

const NearbyMembersGrid = ({ onViewProfile, onStartChat, ageRange, radius, refreshToken }: NearbyMembersGridProps) => {
  const { profile: currentUserProfile } = useAuth();
  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    requestLocation,
    permissionState,
  } = useGeolocation();

  // 0 = illimité → on envoie une grande valeur au RPC
  const maxDistanceKm = radius === 0 ? 100000 : radius;

  const {
    data: nearbyProfiles,
    isLoading: nearbyLoading,
    isFetching: nearbyFetching,
    error: nearbyError,
    refetch: refetchNearby,
    hasGeoData,
  } = useNearbyProfiles(latitude, longitude, maxDistanceKm);

  const hasLocation = latitude != null && longitude != null;
  const [visibleCount, setVisibleCount] = useState(PROFILES_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const mountTimeRef = useRef<number>(performance.now());
  const firstRenderRecordedRef = useRef(false);

  // Mesure le temps mount → premier rendu de profils
  useEffect(() => {
    if (!firstRenderRecordedRef.current && (nearbyProfiles?.length ?? 0) > 0) {
      firstRenderRecordedRef.current = true;
      recordPerfMetric('home', 'time_to_first_profile', performance.now() - mountTimeRef.current, {
        rows: nearbyProfiles?.length ?? 0,
        has_geo: hasLocation,
      });
    }
  }, [nearbyProfiles, hasLocation]);

  // Auto-request si la permission est déjà accordée (pas de prompt en double)
  useEffect(() => {
    if (permissionState === 'granted' && !hasLocation && !locationLoading) {
      void requestLocation();
    }
  }, [permissionState, hasLocation, locationLoading, requestLocation]);

  // Profil de l'utilisateur courant (carte "Toi")
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

  // Tri : profils avec distance d'abord (croissant), puis profils sans GPS en bas
  const sortedProfiles = useMemo(() => {
    const list = [...(nearbyProfiles ?? [])];
    list.sort((a, b) => {
      const aHas = a.distance_km !== null && a.distance_km !== undefined;
      const bHas = b.distance_km !== null && b.distance_km !== undefined;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) return (a.distance_km as number) - (b.distance_km as number);
      return 0;
    });
    return list;
  }, [nearbyProfiles]);

  const allProfiles = useMemo(() => {
    const result: any[] = [];
    if (stableUser) {
      result.push({ ...stableUser, distance_km: null, isCurrentUser: true });
    }
    sortedProfiles.forEach((p) => {
      result.push({ ...p, isCurrentUser: false });
    });
    if (ageRange && (ageRange[0] !== 18 || ageRange[1] !== 99)) {
      return result.filter((p) => {
        if (p.isCurrentUser) return true;
        if (!p.age) return false;
        return p.age >= ageRange[0] && p.age <= ageRange[1];
      });
    }
    return result;
  }, [stableUser, sortedProfiles, ageRange]);

  const externalProfilesCount = allProfiles.filter((p) => !p.isCurrentUser).length;
  const isRefreshing = nearbyFetching;

  // Pré-signe les avatars visibles + un petit buffer, par lot (un seul aller-retour
  // au lieu de N appels séquentiels). Évite de signer inutilement 200 avatars d'un coup.
  useEffect(() => {
    if (!nearbyProfiles || nearbyProfiles.length === 0) return;
    const limit = Math.min(nearbyProfiles.length, visibleCount + PROFILES_PER_PAGE);
    const urls = nearbyProfiles
      .slice(0, limit)
      .map((p) => p.avatar_url)
      .filter(Boolean) as string[];
    if (urls.length > 0) {
      void getSignedAvatarUrls(urls);
    }
  }, [nearbyProfiles, visibleCount]);

  const handleRefresh = useCallback(async () => {
    setVisibleCount(PROFILES_PER_PAGE);
    // Refetch en parallèle de la géoloc pour ne pas attendre le GPS
    void requestLocation();
    await refetchNearby();
  }, [requestLocation, refetchNearby]);

  // Refresh déclenché par le parent (HomeView) via incrément de token
  const lastTokenRef = useRef(refreshToken);
  useEffect(() => {
    if (refreshToken === undefined) return;
    if (refreshToken !== lastTokenRef.current) {
      lastTokenRef.current = refreshToken;
      void handleRefresh();
    }
  }, [refreshToken, handleRefresh]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < allProfiles.length) {
          setVisibleCount((prev) => Math.min(prev + PROFILES_PER_PAGE, allProfiles.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, allProfiles.length]);

  useEffect(() => {
    setVisibleCount(PROFILES_PER_PAGE);
  }, [ageRange, radius]);

  // ───────────────────────────────────────────────────────────────────
  // ÉCRAN BLOQUANT : pas de localisation = pas de profils
  // ───────────────────────────────────────────────────────────────────
  if (!hasLocation) {
    return (
      <GeolocationGate
        permissionState={permissionState}
        loading={locationLoading}
        error={locationError}
        onRequest={() => void requestLocation()}
      />
    );
  }

  // Erreur réseau (avec localisation OK mais requête en échec)
  if (nearbyError && externalProfilesCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border/30 p-8 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-6 h-6 text-destructive" />
        </div>
        <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          Impossible de charger
        </h3>
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

  // Chargement initial
  if (nearbyLoading && externalProfilesCount === 0) {
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

  const visibleProfiles = allProfiles.slice(0, visibleCount);
  const hasMore = visibleCount < allProfiles.length;

  // Découpe en chunks de 9 profils, intercale une pub entre chaque chunk
  const PROFILES_PER_AD = 9;
  const chunks: any[][] = [];
  for (let i = 0; i < visibleProfiles.length; i += PROFILES_PER_AD) {
    chunks.push(visibleProfiles.slice(i, i + PROFILES_PER_AD));
  }

  return (
    <div className="space-y-3">
      {visibleProfiles.length > 0 ? (
        <>
          {chunks.map((chunk, chunkIdx) => (
            <div key={`chunk-${chunkIdx}`} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {chunk.map((profile, idx) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    index={chunkIdx * PROFILES_PER_AD + idx}
                    onViewProfile={onViewProfile}
                    onLike={onStartChat}
                  />
                ))}
              </div>
              {/* Pub après chaque bloc de 9 profils, sauf après le tout dernier si plus rien ne suit */}
              {(chunkIdx < chunks.length - 1 || hasMore) && (
                <AdBanner
                  placement="native"
                  index={chunkIdx}
                  className="my-1"
                />
              )}
            </div>
          ))}

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
          className="text-center py-14 rounded-2xl bg-card border border-border/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
            Aucun membre trouvé
          </h3>
          <p className="text-sm text-muted-foreground px-6">
            {radius !== 0
              ? 'Élargis le rayon depuis le bouton distance en haut'
              : 'Aucun profil disponible pour le moment'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default memo(NearbyMembersGrid);
