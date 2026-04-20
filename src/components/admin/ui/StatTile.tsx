/**
 * StatTile — KPI moderne réutilisable.
 * Grosse valeur, label en bas, trend optionnel, icône en haut à droite.
 * Variante "pulse" pour métriques temps réel (en ligne).
 */
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminCard } from './AdminCard';

interface Props {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  trend?: { value: string; direction?: 'up' | 'down' | 'neutral' };
  pulse?: boolean;
  onClick?: () => void;
  accent?: 'primary' | 'emerald' | 'orange' | 'blue' | 'red' | 'violet';
  className?: string;
}

const accentMap = {
  primary: 'text-primary bg-primary/10',
  emerald: 'text-emerald-500 bg-emerald-500/10',
  orange: 'text-orange-500 bg-orange-500/10',
  blue: 'text-blue-500 bg-blue-500/10',
  red: 'text-red-500 bg-red-500/10',
  violet: 'text-violet-500 bg-violet-500/10',
} as const;

export const StatTile = ({
  label, value, icon: Icon, trend, pulse, onClick, accent = 'primary', className,
}: Props) => {
  const TrendIcon = trend?.direction === 'down' ? TrendingDown : TrendingUp;
  const trendClass =
    trend?.direction === 'down'
      ? 'text-red-500'
      : trend?.direction === 'up'
        ? 'text-emerald-500'
        : 'text-muted-foreground';

  return (
    <AdminCard interactive={!!onClick} onClick={onClick} padding="md" className={cn('group', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', accentMap[accent])}>
          {pulse ? (
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </span>
          ) : (
            Icon && <Icon className="w-4 h-4" />
          )}
        </div>
        {trend && (
          <div className={cn('flex items-center gap-0.5 text-[10px] font-semibold', trendClass)}>
            {trend.direction !== 'neutral' && <TrendIcon className="w-3 h-3" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-display font-bold tracking-tight tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
    </AdminCard>
  );
};
