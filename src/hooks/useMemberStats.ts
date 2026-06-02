import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberStats {
  total: number;
  online: number;
  per_region: Record<string, { total: number; online: number }>;
}

/**
 * Source unique pour les compteurs de membres (total, en ligne, par région).
 *
 * Remplace 3 requêtes parallèles (`useTotalMemberCount`, `useOnlineMemberCount(s)`,
 * `useRegionMemberCounts`) par UNE seule RPC `get_member_stats()` qui agrège
 * tout côté SQL (un seul scan de la table profiles).
 *
 * Le nettoyage des statuts "en ligne" obsolètes est désormais géré par un
 * cron serveur (toutes les minutes) — plus aucune écriture déclenchée par le
 * client à chaque tick.
 */
export const useMemberStats = () => {
  return useQuery<MemberStats>({
    queryKey: ['member-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_stats');
      if (error) throw error;
      const stats = (data as any) ?? {};
      return {
        total: Number(stats.total ?? 0),
        online: Number(stats.online ?? 0),
        per_region: (stats.per_region ?? {}) as MemberStats['per_region'],
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
};
