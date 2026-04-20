/**
 * AdminCard — surface de base unifiée pour tous les panels admin.
 * Style Notion/Stripe : bord discret, fond carte, padding cohérent.
 * Variante "interactive" pour les cartes cliquables (hover + active).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted' | 'primary';
}

const padMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
} as const;

const toneMap = {
  default: 'bg-card border-border/50',
  muted: 'bg-muted/30 border-border/40',
  primary: 'bg-primary/5 border-primary/20',
} as const;

export const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, interactive, padding = 'md', tone = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border transition-all duration-200',
        toneMap[tone],
        padMap[padding],
        interactive &&
          'cursor-pointer hover:border-border hover:shadow-sm hover:-translate-y-px active:translate-y-0 active:scale-[0.99]',
        className,
      )}
      {...props}
    />
  ),
);
AdminCard.displayName = 'AdminCard';
