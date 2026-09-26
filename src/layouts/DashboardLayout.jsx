import { Suspense, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { useCurrentUser } from '@/hooks/use-auth';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import { usePenHover } from '@/hooks/use-pen-hover';
import { InfideepLogo } from '@/components/auth/infideep-logo';
import { TableSkeleton } from '@/components/ui/skeleton';
import { preloadPages } from '@/pages/page-loaders';
import { loadListHooks, prefetchLists } from '@/lib/list-prefetch';

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

  // Signed in: warm the first page of every table and every module's code, in
  // the background and side by side, so opening a module for the first time
  // is as quick as opening it the second time.
  const queryClient = useQueryClient();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    loadListHooks().then(() => prefetchLists(queryClient));
    preloadPages();
  }, [userId, queryClient]);

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
      {/* Pages are code-split (see App.jsx). While a page's chunk downloads the
          shell stays and the content area shows the same skeleton the page
          itself shows while its first query is in flight, so the two waits
          read as one. */}
      <Suspense fallback={<TableSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
