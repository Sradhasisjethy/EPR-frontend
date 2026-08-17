import { SystemRoles } from '@/constants/enums';

// Mirrors backend src/middlewares/authorize.js and src/utils/fieldMasking.js.
const BYPASS_ROLES = [SystemRoles.PLATFORM_ADMIN, SystemRoles.TENANT_OWNER];

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (BYPASS_ROLES.includes(user.role)) return true;
  const held = user.permissions || [];
  // '*' is a role-level wildcard the API leaves unexpanded so the auth cookie
  // stays small — see backend src/utils/permissionCatalog.js.
  return held.includes('*') || held.includes(permission);
};

export const hasAnyPermission = (user, permissions = []) => permissions.some((p) => hasPermission(user, p));

// BR-27: whether rate/amount fields should be shown at all. The API already
// masks them server-side regardless of what the UI does, but showing a
// "N/A"-filled rate column to a user who can never see rates is just noise.
export const canViewRates = (user) => hasPermission(user, 'VIEW_RATES');

/** Flatten a served catalog to `{ code }` entries in display order. */
export const catalogCodes = (modules = []) =>
  modules.flatMap((module) =>
    module.resources.flatMap((resource) => [
      ...resource.actions.map((action) => `${resource.key}_${action}`),
      ...(resource.grants || []).map((grant) => grant.code),
    ])
  );

/**
 * Roles saved before permissions were split into CREATE/MODIFY/DELETE still hold
 * the coarse `<RESOURCE>_WRITE` code. The backend widens those when it resolves a
 * user, but the editor has to do the same or a legacy role would open with its
 * write boxes empty and get silently downgraded on save.
 *
 * Derived from the catalog the API served rather than a second hardcoded map, so
 * there's nothing here to fall out of step.
 */
export const expandLegacyPermissions = (permissions = [], modules = []) => {
  const writable = new Set(
    modules
      .flatMap((module) => module.resources)
      .filter((resource) => resource.actions.includes('CREATE'))
      .map((resource) => resource.key)
  );

  const expanded = new Set();
  for (const permission of permissions) {
    const legacy = permission.endsWith('_WRITE') && permission.slice(0, -'_WRITE'.length);
    if (legacy && writable.has(legacy)) {
      ['READ', 'CREATE', 'MODIFY', 'DELETE'].forEach((action) => expanded.add(`${legacy}_${action}`));
    } else {
      expanded.add(permission);
    }
  }
  return [...expanded];
};
