/**
 * PlanNowTab — onglet Home dédié aux utilisateurs ayant activé Plan Now.
 * Réutilise la géolocalisation et useNearbyProfiles puis filtre via le Set
 * temps-réel des sessions actives (usePlanNowActiveUsers).
 */
import { useMemo } from 'react';
import { Zap, Loader2, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { usePlanNowActiveUsers } from '@/hooks/usePlanNowSession';
import ProfileCard from './ProfileCard';
import GeolocationGate from './GeolocationGate';
import type { RadiusValue } from './RadiusSelector';

interface Props {
  onViewProfile: (userId: string) => void;
  radius: RadiusValue;
}

const PlanNowTab = ({ onViewProfile, radius }: Props) => {
  const { latitude, longitude, loading, error, requestLocation, permissionState } = useGeolocation();
  const maxDistanceKm = radius === 0 ? 100000 : radius;
  const { data: nearbyProfiles, isLoading } = useNearbyProfiles(latitude, longitude, maxDistanceKm);
  const activeIds = usePlanNowActiveUsers();

  const profiles = useMemo(() => {
    const list = nearbyProfiles ?? [];
    return list
      .filter((p) => activeIds.has(p.user_id))
      .sort((a, b) => (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9));
  }, [nearbyProfiles, activeIds]);

  if (!latitude || !longitude) {
    return (
      <GeolocationGate
        loading={loading}
        error={error}
        permissionState={permissionState}
        onRequest={requestLocation}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 text-center"
      >
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-bold text-base mb-1">Personne en Plan Now près de toi</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Active toi-même <span className="font-semibold text-amber-600">Plan Now</span> depuis ton
          profil pour signaler que tu cherches une rencontre immédiate.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
          {profiles.length} {profiles.length > 1 ? 'profils actifs' : 'profil actif'} maintenant
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {profiles.map((profile, i) => (
          <ProfileCard
            key={profile.user_id}
            profile={profile as any}
            index={i}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
      <p className="text-center text-[10px] text-muted-foreground/70 italic pt-2 flex items-center justify-center gap-1.5">
        <Compass className="w-3 h-3" /> Mis à jour en temps réel
      </p>
    </div>
  );
};

export default PlanNowTab;
