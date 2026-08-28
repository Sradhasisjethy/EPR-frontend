import { Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { useCurrentUser } from '@/hooks/use-auth';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';

/**
 * Route guard for everything behind login. The Next.js version had no client-side
 * guard at all — dashboard pages rendered immediately and only got redirected after
 * an API call came back 401. This blocks rendering until the session check resolves,
 * and sends unauthenticated visitors to /login directly.
 */
export function DashboardLayout() {
  const { data: user, isLoading, isError } = useCurrentUser();

  // Initialize inactivity tracking
  useInactivityTimeout();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
