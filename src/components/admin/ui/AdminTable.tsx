/**
 * AdminTable — tableau réutilisable pour les sections admin.
 * - Colonnes typées avec accessor / render custom
 * - Tri optionnel (par colonne sortable: true)
 * - Sélection multiple optionnelle (checkbox)
 * - Loading / empty states intégrés
 * - Responsive : passe en cards stackées sur mobile (mobileCard render)
 */
import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminListSkeleton } from './AdminListSkeleton';
import { EmptyState } from './EmptyState';

export interface AdminColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell render function */
  cell: (row: T, index: number) => React.ReactNode;
  /** Optional value extractor for sorting */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  /** Hide on mobile — use mobileCard for that data instead */
  hideOnMobile?: boolean;
}

interface Props<T> {
  data: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Sélection multiple */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Render mobile (sm: hidden) — si fourni, masque le tableau sur mobile */
  mobileCard?: (row: T, index: number) => React.ReactNode;
  className?: string;
  skeletonCount?: number;
}

const alignMap = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export function AdminTable<T>({
  data,
  columns,
  rowKey,
  loading,
  emptyIcon,
  emptyTitle = 'Aucun résultat',
  emptyDescription,
  emptyAction,
  onRowClick,
  selectable,
  selectedIds = [],
  onSelectionChange,
  mobileCard,
  className,
  skeletonCount = 6,
}: Props<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const arr = [...data];
    arr.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allIds = React.useMemo(() => sorted.map((r, i) => rowKey(r, i)), [sorted, rowKey]);
  const allSelected = selectable && allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = selectable && selectedIds.length > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : allIds);
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id],
    );
  };

  if (loading) {
    return <AdminListSkeleton count={skeletonCount} className={className} />;
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? Inbox}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile : cards stackées si fourni, sinon tableau scrollable */}
      {mobileCard && (
        <div className="md:hidden space-y-2.5">
          {sorted.map((row, i) => (
            <div key={rowKey(row, i)}>{mobileCard(row, i)}</div>
          ))}
        </div>
      )}

      <div
        className={cn(
          'rounded-2xl border border-border/50 bg-card overflow-hidden',
          mobileCard && 'hidden md:block',
        )}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/40">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                )}
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  const SortIcon = !col.sortable
                    ? null
                    : !isSorted
                      ? ChevronsUpDown
                      : sortDir === 'asc'
                        ? ChevronUp
                        : ChevronDown;
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
                        alignMap[col.align ?? 'left'],
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.sortable && 'cursor-pointer select-none hover:text-foreground',
                        col.headerClassName,
                      )}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {SortIcon && (
                          <SortIcon
                            className={cn(
                              'w-3 h-3',
                              isSorted ? 'text-primary' : 'opacity-40',
                            )}
                          />
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => {
                const id = rowKey(row, i);
                const checked = selectedIds.includes(id);
                return (
                  <TableRow
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    data-state={checked ? 'selected' : undefined}
                    className={cn(
                      'border-border/40 transition-colors',
                      onRowClick && 'cursor-pointer',
                      checked && 'bg-primary/5 hover:bg-primary/10',
                    )}
                  >
                    {selectable && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label="Sélectionner la ligne"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'py-3 text-sm',
                          alignMap[col.align ?? 'left'],
                          col.hideOnMobile && 'hidden md:table-cell',
                          col.className,
                        )}
                      >
                        {col.cell(row, i)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
