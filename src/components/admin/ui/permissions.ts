/**
 * Permissions helpers — source unique de vérité pour décider si un
 * élément (item de nav, bouton, action de carte) doit être visible
 * selon le rôle (admin) et les permissions (modérateur).
 *
 * Règle unifiée :
 *   - admin → tout est visible
 *   - sinon, si `permissionKey` est définie → la permission doit être true
 *   - sinon, si `adminOnly` est true → masqué
 *   - sinon → visible
 */
import { useOutletContext } from 'react-router-dom';
import type { ModPermissions } from '../AdminSidebar';
import type { AdminOutletContext } from '@/pages/admin/AdminLayout';

export type { ModPermissions };

export interface PermissionGuard {
  permissionKey?: keyof ModPermissions;
  adminOnly?: boolean;
}

export function hasAccess(
  guard: PermissionGuard,
  ctx: { isAdmin: boolean; modPermissions?: ModPermissions | null },
): boolean {
  if (ctx.isAdmin) return true;
  if (guard.permissionKey) return Boolean(ctx.modPermissions?.[guard.permissionKey]);
  if (guard.adminOnly) return false;
  return true;
}

/**
 * Lit les permissions depuis l'OutletContext d'AdminLayout.
 * Fallback inoffensif (tout masqué) si appelé hors layout admin.
 */
export function useAdminPermissions(): {
  isAdmin: boolean;
  modPermissions: ModPermissions | null;
  canAccess: (guard: PermissionGuard) => boolean;
} {
  let ctx: Partial<AdminOutletContext> | null = null;
  try {
    ctx = useOutletContext<AdminOutletContext>();
  } catch {
    ctx = null;
  }
  const isAdmin = Boolean(ctx?.isAdmin);
  const modPermissions = ctx?.modPermissions ?? null;
  return {
    isAdmin,
    modPermissions,
    canAccess: (guard) => hasAccess(guard, { isAdmin, modPermissions }),
  };
}
