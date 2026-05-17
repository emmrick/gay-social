import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RotationRow {
  ad_id: string;
  ad_title: string;
  advertiser_name: string;
  placement: string;
  impressions: number;
  unique_users: number;
  last_impression: string;
}

const WINDOWS = [
  { label: '1h', value: 1 },
  { label: '6h', value: 6 },
  { label: '24h', value: 24 },
  { label: '7j', value: 24 * 7 },
];

const AdRotationStatsPanel = () => {
  const [hours, setHours] = useState(24);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ad-rotation-stats', hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ad_rotation_stats' as any, { _hours: hours });
      if (error) throw error;
      return (data || []) as RotationRow[];
    },
    staleTime: 30_000,
  });

  // Aggregate per-placement totals to flag domination (one ad > 60% of placement impressions)
  const totalsByPlacement = (data || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.placement] = (acc[r.placement] || 0) + r.impressions;
    return acc;
  }, {});

  const sorted = [...(data || [])].sort((a, b) => {
    if (a.placement !== b.placement) return a.placement.localeCompare(b.placement);
    return b.impressions - a.impressions;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Rotation des publicités
          </CardTitle>
          <div className="flex items-center gap-1">
            {WINDOWS.map(w => (
              <Button
                key={w.value}
                size="sm"
                variant={hours === w.value ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => setHours(w.value)}
              >
                {w.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Impressions par annonce et par placement sur les dernières {hours}h. Un déséquilibre {'>'}60% indique une rotation faible.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Chargement…</p>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune impression sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/40">
                  <th className="py-2 pr-3 font-medium">Placement</th>
                  <th className="py-2 pr-3 font-medium">Annonce</th>
                  <th className="py-2 pr-3 font-medium text-right">Impr.</th>
                  <th className="py-2 pr-3 font-medium text-right">Part</th>
                  <th className="py-2 pr-3 font-medium text-right">Users uniq.</th>
                  <th className="py-2 pr-3 font-medium text-right">Dernière vue</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const total = totalsByPlacement[r.placement] || 1;
                  const share = (r.impressions / total) * 100;
                  const dominant = share > 60 && total >= 10;
                  return (
                    <tr key={`${r.ad_id}-${r.placement}`} className="border-b border-border/20">
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px] font-mono">{r.placement}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium truncate max-w-[180px]">{r.ad_title}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{r.advertiser_name}</p>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right">
                        <span className={`inline-flex items-center gap-1 tabular-nums ${dominant ? 'text-destructive font-semibold' : ''}`}>
                          {dominant && <AlertTriangle className="w-3 h-3" />}
                          {share.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.unique_users.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">
                        {formatDistanceToNow(new Date(r.last_impression), { addSuffix: true, locale: fr })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdRotationStatsPanel;
