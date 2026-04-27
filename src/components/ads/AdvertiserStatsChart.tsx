import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface AdvertiserStatsChartProps {
  campaignIds: string[];
  days?: number;
}

interface DailyPoint {
  date: string;
  label: string;
  impressions: number;
  clicks: number;
}

export const AdvertiserStatsChart = ({ campaignIds, days = 14 }: AdvertiserStatsChartProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['advertiser-stats-chart', campaignIds, days],
    enabled: campaignIds.length > 0,
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), days - 1)).toISOString();

      const [imps, clk] = await Promise.all([
        supabase.from('ad_impressions').select('created_at').in('ad_id', campaignIds).gte('created_at', since),
        supabase.from('ad_clicks').select('created_at').in('ad_id', campaignIds).gte('created_at', since),
      ]);

      const buckets = new Map<string, DailyPoint>();
      for (let i = 0; i < days; i++) {
        const d = startOfDay(subDays(new Date(), days - 1 - i));
        const key = format(d, 'yyyy-MM-dd');
        buckets.set(key, { date: key, label: format(d, 'dd MMM', { locale: fr }), impressions: 0, clicks: 0 });
      }
      (imps.data || []).forEach((r: any) => {
        const k = format(new Date(r.created_at), 'yyyy-MM-dd');
        const b = buckets.get(k);
        if (b) b.impressions += 1;
      });
      (clk.data || []).forEach((r: any) => {
        const k = format(new Date(r.created_at), 'yyyy-MM-dd');
        const b = buckets.get(k);
        if (b) b.clicks += 1;
      });

      return Array.from(buckets.values());
    },
  });

  if (campaignIds.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm">Évolution sur {days} jours</h4>
        </div>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Chargement…</div>
        ) : data && data.some(d => d.impressions > 0 || d.clicks > 0) ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" name="Clics" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            Pas encore de données. Vos statistiques apparaîtront dès la première impression.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
