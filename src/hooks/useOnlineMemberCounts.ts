import { useMemberStats } from './useMemberStats';

/**
 * Compteurs de membres en ligne par région.
 * Dérive du cache partagé `useMemberStats` — aucune requête supplémentaire.
 */
export const useOnlineMemberCounts = () => {
  const q = useMemberStats();
  const counts: Record<string, number> = {};
  const perRegion = q.data?.per_region ?? {};
  for (const region of Object.keys(perRegion)) {
    counts[region] = perRegion[region]?.online ?? 0;
  }
  return {
    ...q,
    data: counts,
  };
};
