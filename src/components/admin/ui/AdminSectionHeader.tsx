/**
 * AdminSectionHeader — titre de section uniforme.
 * Petit eyebrow + titre display + action optionnelle à droite.
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon?: LucideIcon;
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
}

export const AdminSectionHeader = ({ icon: Icon, title, eyebrow, action, className }: Props) => (
  <div className={cn('flex items-end justify-between gap-3 mb-3', className)}>
    <div className="min-w-0">
      {eyebrow && (
        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-0.5">
          {eyebrow}
        </span>
      )}
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary flex-shrink-0" />}
        <h2 className="text-sm md:text-base font-display font-semibold tracking-tight">{title}</h2>
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);
