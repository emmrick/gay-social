/**
 * ActionTile — bouton/carte d'action avec compteur prioritaire.
 * Utilisé pour les "actions urgentes" et l'accès rapide dans le dashboard.
 */
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  icon: LucideIcon;
  count?: number;
  onClick: () => void;
  accent?: 'primary' | 'emerald' | 'orange' | 'blue' | 'red' | 'violet';
  variant?: 'urgent' | 'quick';
}

const accentMap = {
  primary: { text: 'text-primary', bg: 'bg-primary/10', ring: 'group-hover:ring-primary/30' },
  emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'group-hover:ring-emerald-500/30' },
  orange: { text: 'text-orange-500', bg: 'bg-orange-500/10', ring: 'group-hover:ring-orange-500/30' },
  blue: { text: 'text-blue-500', bg: 'bg-blue-500/10', ring: 'group-hover:ring-blue-500/30' },
  red: { text: 'text-red-500', bg: 'bg-red-500/10', ring: 'group-hover:ring-red-500/30' },
  violet: { text: 'text-violet-500', bg: 'bg-violet-500/10', ring: 'group-hover:ring-violet-500/30' },
} as const;

export const ActionTile = ({
  label, icon: Icon, count, onClick, accent = 'primary', variant = 'urgent',
}: Props) => {
  const c = accentMap[accent];

  if (variant === 'quick') {
    return (
      <button
        onClick={onClick}
        className="group flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all active:scale-[0.97]"
      >
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', c.bg)}>
          <Icon className={cn('w-4 h-4', c.text)} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-border/50 bg-card text-left',
        'hover:border-border hover:shadow-md hover:-translate-y-px active:translate-y-0 active:scale-[0.98] transition-all duration-200',
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
          <Icon className={cn('w-4 h-4', c.text)} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      {count !== undefined && (
        <span className={cn('text-2xl font-display font-bold tabular-nums leading-none', c.text)}>
          {count}
        </span>
      )}
      <span className="text-[12px] font-medium text-foreground/80">{label}</span>
    </button>
  );
};
