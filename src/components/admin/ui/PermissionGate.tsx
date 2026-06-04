/**
 * PermissionGate — masque ses enfants si l'utilisateur courant
 * (admin ou modérateur) n'a pas la permission requise.
 *
 * Source unique : `useAdminPermissions()` (lit l'OutletContext d'AdminLayout).
 * Peut recevoir un override via `isAdmin` / `modPermissions` si utilisé
 * hors layout admin.
 */
import * as React from 'react';
import { hasAccess, useAdminPermissions, type ModPermissions, type PermissionGuard } from './permissions';

interface Props extends PermissionGuard {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Overrides facultatifs si on n'est pas dans AdminLayout. */
  isAdmin?: boolean;
  modPermissions?: ModPermissions | null;
}

export const PermissionGate = ({
  children,
  fallback = null,
  permissionKey,
  adminOnly,
  isAdmin,
  modPermissions,
}: Props) => {
  const ctx = useAdminPermissions();
  const effective = {
    isAdmin: isAdmin ?? ctx.isAdmin,
    modPermissions: modPermissions ?? ctx.modPermissions,
  };
  const allowed = hasAccess({ permissionKey, adminOnly }, effective);
  return <>{allowed ? children : fallback}</>;
};
