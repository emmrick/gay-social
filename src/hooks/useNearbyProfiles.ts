import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { recordPerfMetric } from '@/lib/perfMetrics';

interface NearbyProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  is_online: boolean | null;
  last_seen: string | null;
  region: string;
  distance_km: number | null;
}

const ONLINE_STATUS_STALE_HOURS = 2;

const fixStaleOnlineStatus = (profile: NearbyProfile): NearbyProfile => {
  if (profile.is_online && profile.last_seen) {
    const staleThreshold = new Date(Date.now() - ONLINE_STATUS_STALE_HOURS * 60 * 60 * 1000);
    if (new Date(profile.last_seen) < staleThreshold) {
      return { ...profile, is_online: false };
    }
  }
  return profile;
};

/**
 * Hook unifié de chargement des profils proches.
 *
 * Stratégie anti-rechargements-simultanés :
 *  - Une SEULE source quand la géoloc est dispo (RPC `get_nearby_profiles`,
 *    qui filtre déjà vérifiés / bloqués / suspendus / hide-location).
 *  - Un fallback liste-globale UNIQUEMENT tant que la géoloc n'est pas dispo
 *    (désactivé dès qu'on a une lat/lon, plus de double fetch périodique).
 *  - `placeholderData: keepPreviousData` → aucun spinner sur changement de
 *    rayon / refetch en arrière-plan.
 *  - `refetchInterval` décalé entre les deux queries pour ne jamais déclencher
 *    deux requêtes profils dans la même tick.
 */
export const useNearbyProfiles = (
  latitude: number | null,
  longitude: number | null,
  maxDistance: number = 50000
) => {
  const { user } = useAuth();
  const hasGeo = latitude != null && longitude != null;

  // Fallback : liste globale, activée seulement TANT QUE la géoloc n'est pas prête.
  // Dès que `hasGeo` devient vrai, cette query s'arrête (plus de refetch parallèle).
  const baseQuery = useQuery({
    queryKey: ['nearby-profiles-base', user?.id],
    queryFn: async (): Promise<NearbyProfile[]> => {
      if (!user) return [];
      const t0 = performance.now();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, bio, age, is_online, last_seen, region')
        .neq('user_id', user.id)
        .eq('is_verified', true)
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false, nullsFirst: false })
        .limit(200);

      recordPerfMetric('home', 'nearby_base_query', performance.now() - t0, {
        ok: !error,
        rows: data?.length ?? 0,
      });

      if (error) throw error;

      let profiles = (data || []).map((p) =>
        fixStaleOnlineStatus({ ...p, distance_km: null } as NearbyProfile)
      );

      // Avatars manquants → essai depuis profile_photos
      const missingAvatarIds = profiles.filter((p) => !p.avatar_url).map((p) => p.user_id);
      if (missingAvatarIds.length > 0) {
        const { data: photos } = await supabase
          .from('profile_photos')
          .select('user_id, photo_url, is_primary, display_order')
          .in('user_id', missingAvatarIds)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true });

        if (photos && photos.length > 0) {
          const photoMap = new Map<string, string>();
          for (const photo of photos) {
            if (!photoMap.has(photo.user_id)) photoMap.set(photo.user_id, photo.photo_url);
          }
          profiles = profiles.map((p) =>
            !p.avatar_url && photoMap.has(p.user_id)
              ? { ...p, avatar_url: photoMap.get(p.user_id)! }
              : p
          );
        }
      }

      profiles = profiles.filter((p) => !!p.avatar_url);

      if (profiles.length > 0) {
        const { data: blockedIds } = await supabase.rpc('filter_suspended_or_blocked_users', {
          _user_ids: profiles.map((p) => p.user_id),
        });
        const blockedSet = new Set<string>((blockedIds as string[] | null) ?? []);
        profiles = profiles.filter((p) => !blockedSet.has(p.user_id));
      }

      return profiles;
    },
    // Désactivé dès que la géoloc est dispo → plus de double fetch.
    enabled: !!user && !hasGeo,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Pas de refetchInterval ici : la géoQuery prendra le relais.
    placeholderData: keepPreviousData,
  });

  // Source principale dès qu'on a la géoloc. La RPC filtre déjà
  // vérifiés / bloqués / suspendus / hide-location et exclut les profils sans
  // photo → aucun post-traitement supplémentaire nécessaire côté client.
  const geoQuery = useQuery({
    queryKey: ['nearby-profiles-geo', user?.id, latitude, longitude, maxDistance],
    queryFn: async (): Promise<NearbyProfile[]> => {
      if (!hasGeo) return [];
      const t0 = performance.now();

      const { data, error } = await supabase.rpc('get_nearby_profiles', {
        user_lat: latitude!,
        user_lon: longitude!,
        max_distance_km: maxDistance,
        limit_count: 200,
      });

      recordPerfMetric('home', 'nearby_geo_rpc', performance.now() - t0, {
        ok: !error,
        rows: (data as any[] | null)?.length ?? 0,
        radius_km: maxDistance,
      });

      if (error) throw error;

      return (data || []).map((p: any) =>
        fixStaleOnlineStatus({ ...p, is_verified: true } as NearbyProfile)
      );
    },
    enabled: !!user && hasGeo,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Refetch périodique uniquement quand la géoQuery est la source active.
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  // Une seule source à la fois : géo si dispo, sinon fallback global.
  const profiles = useMemo(() => {
    if (hasGeo) return geoQuery.data ?? [];
    return baseQuery.data ?? [];
  }, [hasGeo, geoQuery.data, baseQuery.data]);

  const activeQuery = hasGeo ? geoQuery : baseQuery;

  return {
    data: profiles,
    isLoading: activeQuery.isLoading && profiles.length === 0,
    isFetching: activeQuery.isFetching,
    error: activeQuery.error,
    refetch: async () => {
      if (hasGeo) await geoQuery.refetch();
      else await baseQuery.refetch();
    },
    hasGeoData: hasGeo && (geoQuery.data?.length ?? 0) > 0,
  };
};

export default useNearbyProfiles;
