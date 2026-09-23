import { Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { useCurrentUser } from '@/hooks/use-auth';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import { usePenHover } from '@/hooks/use-pen-hover';
import { InfideepLogo } from '@/components/auth/infideep-logo';

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
  // Pen hover only — see use-pen-hover.js for why this cannot be a media query.
  usePenHover();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        {/* The mark rather than a generic ring: this is the one moment the
            app has nothing to show, so it may as well say whose app it is.
            It pulses rather than spins — a rotating logo reads as cheap. */}
        <InfideepLogo showWordmark={false} glow className="h-12 w-auto" />
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
