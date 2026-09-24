import { useMemo } from 'react';
import { useCurrentUser } from './use-auth';
import { hasPermission as check, hasAnyPermission as checkAny, canViewRates } from '@/lib/permissions';

/**
 * The current user's permissions, bound so components don't pass `user` around.
 *
 * This used to carry its own copy of the rules, and the copy had drifted from
 * lib/permissions.js in ways that all resolved towards granting access:
 *
 *   - it treated ORG_ADMIN as a bypass role. The backend's bypass list is
 *     PLATFORM_ADMIN and TENANT_OWNER only (middlewares/authorize.js), so an
 *     ORG_ADMIN was shown controls the API would refuse.
 *   - it did not understand the `*` wildcard the API leaves unexpanded, so a
 *     wildcard user got an empty sidebar while every page-level check — which
 *     imported the other module — said yes.
 *   - `hasAnyPermission([])` returned true here and false there, and
 *     `hasPermission(undefined)` returned true, which is the opposite of
 *     deny-by-default.
 *
 * It is now a thin binding over the same functions the rest of the app calls,
 * so there is one rule rather than two that merely look alike.
 */
export function usePermissions() {
  const { data: user, isLoading } = useCurrentUser();

  return useMemo(
    () => ({
      user,
      isLoading,
      role: user?.role,
      permissions: user?.permissions || [],
      hasPermission: (permission) => check(user, permission),
      hasAnyPermission: (permissions) => checkAny(user, permissions),
      canViewRates: () => canViewRates(user),
    }),
    [user, isLoading]
  );
}
