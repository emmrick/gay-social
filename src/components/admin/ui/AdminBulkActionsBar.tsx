/**
 * AdminBulkActionsBar — barre flottante d'actions en lot.
 * Apparaît en bas dès qu'un ou plusieurs items sont sélectionnés.
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  count: number;
  onClear: () => void;
  actions: React.ReactNode;
  className?: string;
}

export const AdminBulkActionsBar = ({ count, onClear, actions, className }: Props) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'sticky bottom-3 z-30 mx-auto max-w-2xl mt-3',
        'flex items-center gap-2 px-3 py-2 rounded-2xl',
        'bg-foreground text-background shadow-lg shadow-foreground/20',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        className,
      )}
      role="region"
      aria-label="Actions groupées"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-8 w-8 text-background hover:bg-background/10 hover:text-background flex-shrink-0"
        aria-label="Désélectionner"
      >
        <X className="w-4 h-4" />
      </Button>
      <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
        {count} sélectionné{count > 1 ? 's' : ''}
      </span>
      <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">{actions}</div>
    </div>
  );
};
