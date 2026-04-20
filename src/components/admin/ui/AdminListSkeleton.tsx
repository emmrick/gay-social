/**
 * AdminListSkeleton — skeleton uniforme pour toutes les listes admin.
 */
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  count?: number;
  variant?: 'card' | 'row';
  className?: string;
}

export const AdminListSkeleton = ({ count = 5, variant = 'card', className }: Props) => (
  <div className={cn('space-y-2.5', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'rounded-2xl border border-border/40 bg-card/50 p-4 flex items-center gap-3',
          variant === 'row' ? 'h-14 py-2' : 'h-20',
        )}
      >
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-2/3" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full hidden md:block" />
      </div>
    ))}
  </div>
);
