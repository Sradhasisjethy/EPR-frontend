import { useCurrentUser } from './use-auth';

const BYPASS_ROLES = ['PLATFORM_ADMIN', 'TENANT_OWNER', 'ORG_ADMIN'];

export function usePermissions() {
  const { data: user } = useCurrentUser();

  const hasPermission = (permission) => {
    if (!user) return false;
    if (BYPASS_ROLES.includes(user.role)) return true;
    if (!permission) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions = []) => {
    if (!user) return false;
    if (BYPASS_ROLES.includes(user.role)) return true;
    if (!permissions.length) return true;
    return permissions.some((p) => user.permissions?.includes(p));
  };

  return {
    user,
    role: user?.role,
    permissions: user?.permissions || [],
    hasPermission,
    hasAnyPermission,
    isAdmin: BYPASS_ROLES.includes(user?.role),
  };
}
