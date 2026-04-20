/**
 * EmptyState — état vide unifié pour toutes les listes admin.
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className }: Props) => (
  <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-muted-foreground/60" />
    </div>
    <h3 className="text-sm font-display font-semibold mb-1">{title}</h3>
    {description && <p className="text-xs text-muted-foreground max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
