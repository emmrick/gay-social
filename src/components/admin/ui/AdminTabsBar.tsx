/**
 * AdminTabsBar — barre d'onglets pilule, scroll horizontal mobile, badge de comptage.
 * Alternative compacte aux <Tabs/> shadcn pour les sections admin.
 */
import { cn } from '@/lib/utils';

export interface AdminTab<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  tone?: 'default' | 'warning' | 'success' | 'danger' | 'info';
}

interface Props<T extends string> {
  tabs: AdminTab<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

const toneActive: Record<NonNullable<AdminTab['tone']>, string> = {
  default: 'bg-primary text-primary-foreground border-primary',
  warning: 'bg-orange-500 text-white border-orange-500',
  success: 'bg-emerald-500 text-white border-emerald-500',
  danger: 'bg-red-500 text-white border-red-500',
  info: 'bg-blue-500 text-white border-blue-500',
};

export function AdminTabsBar<T extends string>({ tabs, value, onChange, className }: Props<T>) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 p-1 bg-muted/40 border border-border/40 rounded-2xl overflow-x-auto scrollbar-hide',
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border border-transparent transition-all whitespace-nowrap',
              active
                ? toneActive[t.tone ?? 'default']
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
            )}
            aria-pressed={active}
          >
            <span>{t.label}</span>
            {typeof t.count === 'number' && t.count > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0 rounded-full text-[10px] font-bold tabular-nums',
                  active ? 'bg-white/20' : 'bg-foreground/10',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
