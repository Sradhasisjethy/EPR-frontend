import { Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';
import { AccessDenied } from './access-denied';

/**
 * Route-level permission gate.
 *
 * Until this existed the only guard in front of a page was DashboardLayout,
 * which checks that you are *logged in* and nothing else. Hiding a sidebar item
 * was the whole of the client-side access control, so typing the URL — or using
 * Cmd-K search, which reads the same nav list without filtering it — opened the
 * page regardless of grants. That is the gap this closes.
 *
 * It closes it for the user's benefit, not the system's: a page reached this way
 * would still have every one of its API calls refused, so what the user actually
 * met was a screen of "Data Unavailable — the server might be unreachable"
 * errors that read like an outage rather than a permission problem. The
 * authority remains the API; this makes the client agree with it, in time to say
 * something true.
 *
 * Usage as a layout route, so a whole group of routes shares one gate:
 *
 *   <Route element={<RequirePermission permission="ROLE_READ" />}>
 *     <Route path="/roles" element={<RolesPage />} />
 *   </Route>
 *
 * `anyPermissions` mirrors the sidebar's rule for hub pages that show whichever
 * tabs the user can see: entry needs only one of them, and the page then filters
 * its own tabs.
 */
export function RequirePermission({ permission, anyPermissions, children }) {
  const { hasPermission, hasAnyPermission, isLoading, user } = usePermissions();

  // DashboardLayout already blocks rendering until the session resolves, but a
  // guard that reads permissions must not decide while they are still unknown —
  // deny-by-default would otherwise flash Access Denied on every reload.
  if (isLoading || !user) return null;

  const allowed = anyPermissions
    ? hasAnyPermission(anyPermissions)
    : permission
      ? hasPermission(permission)
      : true;

  if (!allowed) return <AccessDenied />;

  return children ?? <Outlet />;
}
