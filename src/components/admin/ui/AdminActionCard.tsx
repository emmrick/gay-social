/**
 * AdminActionCard — carte d'admin/modération avec une liste d'actions
 * filtrées automatiquement selon `permissionKey` / `adminOnly`.
 *
 * Objectif : éviter que chaque page admin réimplémente sa propre logique
 * de visibilité et finisse par diverger (bug récurrent : actions masquées
 * pour un modérateur qui devrait pourtant y avoir accès).
 *
 * Usage :
 *   <AdminActionCard
 *     title="Modération du membre"
 *     description="Actions disponibles selon vos permissions"
 *     actions={[
 *       { id: 'warn',    label: 'Avertir',    icon: AlertTriangle, onClick: ..., permissionKey: 'can_manage_users' },
 *       { id: 'suspend', label: 'Suspendre',  icon: Ban,           onClick: ..., adminOnly: true },
 *       { id: 'verify',  label: 'Vérifier',   icon: IdCard,        onClick: ..., permissionKey: 'can_verify_identity' },
 *     ]}
 *   />
 *
 * Toutes les actions sans permission requise restent visibles par défaut
 * (équivalent du comportement legacy). Une action avec `adminOnly` est
 * masquée pour les modérateurs sauf permission explicite via `permissionKey`.
 */
import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminCard } from './AdminCard';
import { EmptyState } from './EmptyState';
import { useAdminPermissions, type ModPermissions, type PermissionGuard } from './permissions';

export interface AdminCardAction extends PermissionGuard {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  description?: string;
  badge?: number | string;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
}

interface Props {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions: AdminCardAction[];
  footer?: React.ReactNode;
  className?: string;
  /** Texte affiché si aucune action n'est visible. null = masquer la carte. */
  emptyLabel?: string | null;
  /** Layout des actions : liste verticale (par défaut) ou grille compacte. */
  layout?: 'list' | 'grid';
  /** Overrides hors AdminLayout. */
  isAdmin?: boolean;
  modPermissions?: ModPermissions | null;
}

const toneMap = {
  default: 'text-foreground hover:bg-muted/60',
  primary: 'text-primary hover:bg-primary/10',
  danger:  'text-destructive hover:bg-destructive/10',
  success: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
  warning: 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10',
} as const;

const toneIconBg = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  danger:  'bg-destructive/10 text-destructive',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
} as const;

export const AdminActionCard = ({
  title,
  description,
  icon: HeaderIcon,
  actions,
  footer,
  className,
  emptyLabel = 'Aucune action disponible avec vos permissions',
  layout = 'list',
  isAdmin,
  modPermissions,
}: Props) => {
  const ctx = useAdminPermissions();
  const effective = {
    isAdmin: isAdmin ?? ctx.isAdmin,
    modPermissions: modPermissions ?? ctx.modPermissions,
  };

  const visible = React.useMemo(
    () =>
      actions.filter((a) => {
        if (effective.isAdmin) return true;
        if (a.permissionKey) return Boolean(effective.modPermissions?.[a.permissionKey]);
        if (a.adminOnly) return false;
        return true;
      }),
    [actions, effective.isAdmin, effective.modPermissions],
  );

  if (visible.length === 0 && emptyLabel === null) return null;

  return (
    <AdminCard className={className} padding="md">
      {(title || description) && (
        <div className="flex items-start gap-3 mb-3">
          {HeaderIcon && (
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <HeaderIcon className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {title && <div className="font-display font-semibold text-[14px] leading-tight truncate">{title}</div>}
            {description && (
              <div className="text-[12px] text-muted-foreground mt-0.5">{description}</div>
            )}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState title={emptyLabel ?? ''} />
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {visible.map((a) => {
            const Icon = a.icon;
            const tone = a.tone ?? 'default';
            return (
              <button
                key={a.id}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className={cn(
                  'group flex flex-col items-start gap-2 p-3 rounded-xl border border-border/50 bg-card text-left transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  toneMap[tone],
                )}
              >
                {Icon && (
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', toneIconBg[tone])}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <span className="text-[12px] font-medium leading-tight">{a.label}</span>
                {a.description && (
                  <span className="text-[11px] text-muted-foreground leading-tight">{a.description}</span>
                )}
                {a.badge !== undefined && a.badge !== '' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                    {a.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {visible.map((a) => {
            const Icon = a.icon;
            const tone = a.tone ?? 'default';
            return (
              <button
                key={a.id}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  toneMap[tone],
                )}
              >
                {Icon && (
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', toneIconBg[tone])}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium leading-tight">{a.label}</div>
                  {a.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{a.description}</div>
                  )}
                </div>
                {a.badge !== undefined && a.badge !== '' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive flex-shrink-0">
                    {a.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {footer && <div className="mt-3 pt-3 border-t border-border/40">{footer}</div>}
    </AdminCard>
  );
};
