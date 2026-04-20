/**
 * AdminFilterBar — barre de filtres unifiée pour toutes les sections admin.
 * Recherche + filtres rapides + actions à droite.
 */
import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const AdminFilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filters,
  actions,
  className,
}: Props) => (
  <div
    className={cn(
      'flex flex-col gap-2 md:flex-row md:items-center md:gap-3 mb-3',
      className,
    )}
  >
    {onSearchChange && (
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
        <Input
          value={searchValue ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 pr-9 h-9 bg-muted/40 border-border/50 rounded-xl focus-visible:ring-1"
        />
        {searchValue && (
          <button
            type="button"
            aria-label="Effacer"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )}
    {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
    {actions && <div className="flex items-center gap-2 md:ml-auto">{actions}</div>}
  </div>
);

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  count?: number;
  className?: string;
}

export const AdminFilterChip = ({ active, onClick, children, count, className }: ChipProps) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={cn(
      'h-8 px-3 rounded-full text-xs font-medium border transition-all',
      active
        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
        : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground',
      className,
    )}
  >
    <span>{children}</span>
    {typeof count === 'number' && count > 0 && (
      <span
        className={cn(
          'ml-1.5 px-1.5 py-0 rounded-full text-[10px] font-bold tabular-nums',
          active ? 'bg-primary-foreground/20' : 'bg-foreground/10',
        )}
      >
        {count}
      </span>
    )}
  </Button>
);
