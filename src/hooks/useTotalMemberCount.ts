import { useMemberStats } from './useMemberStats';

/**
 * Compteurs de membres — wrappers fins autour de `useMemberStats` pour
 * conserver l'API publique existante sans déclencher de requêtes
 * supplémentaires (toutes les pages partagent le même cache).
 */

export const useTotalMemberCount = () => {
  const q = useMemberStats();
  return {
    ...q,
    data: q.data?.total ?? 0,
  };
};

export const useOnlineMemberCount = () => {
  const q = useMemberStats();
  return {
    ...q,
    data: q.data?.online ?? 0,
  };
};
