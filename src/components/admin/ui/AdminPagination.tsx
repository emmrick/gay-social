/**
 * AdminPagination — pagination compacte client-side ou contrôlée.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const AdminPagination = ({ page, pageSize, total, onPageChange, className }: Props) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1) {
    return (
      <div className={cn('flex items-center justify-end text-xs text-muted-foreground', className)}>
        {total > 0 && <span>{total} résultat{total > 1 ? 's' : ''}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="tabular-nums">
        {from}–{to} sur <span className="font-semibold text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-2 font-medium text-foreground tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
