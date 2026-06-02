import { useMemberStats } from './useMemberStats';

interface RegionMemberCount {
  region: string;
  total: number;
  online: number;
}

/**
 * Compteurs par région — dérivés du cache partagé `useMemberStats`,
 * pas de requête supplémentaire.
 */
export const useRegionMemberCounts = () => {
  const q = useMemberStats();
  const counts: Record<string, RegionMemberCount> = {};
  const perRegion = q.data?.per_region ?? {};
  for (const region of Object.keys(perRegion)) {
    counts[region] = {
      region,
      total: perRegion[region]?.total ?? 0,
      online: perRegion[region]?.online ?? 0,
    };
  }
  return {
    ...q,
    data: counts,
  };
};

export const useRegionMemberCount = (regionCode: string) => {
  const { data: counts, isLoading } = useRegionMemberCounts();
  return {
    total: counts?.[regionCode]?.total || 0,
    online: counts?.[regionCode]?.online || 0,
    isLoading,
  };
};
