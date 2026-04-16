/**
 * Reusable atomic UI for the Admin Tasks section.
 * - SectionHeader : icon + title + optional subtitle/right slot
 * - StatPill      : compact stat (label + value)
 * - EmptyState    : empty list placeholder
 * - LoadingList   : skeleton list
 * - ErrorState    : retry-friendly error UI
 */
import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold truncate">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

export const StatPill = ({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) => (
  <Card
    className={cn(
      'p-3 text-center',
      accent && 'bg-primary/5 border-primary/30',
    )}
  >
    <p className="text-xl font-bold leading-tight">{value}</p>
    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
  </Card>
);

export const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description?: string;
}) => (
  <div className="text-center py-12 text-muted-foreground">
    <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
    <p className="text-sm font-medium">{title}</p>
    {description && <p className="text-xs mt-1">{description}</p>}
  </div>
);

export const LoadingList = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-20 rounded-xl" />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message?: string; onRetry?: () => void }) => (
  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">Une erreur est survenue</p>
      <p className="text-xs text-muted-foreground truncate">{message ?? 'Réessayez dans un instant.'}</p>
    </div>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
        <RefreshCw className="w-3 h-3 mr-1" /> Réessayer
      </Button>
    )}
  </div>
);
