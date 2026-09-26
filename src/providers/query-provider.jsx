import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { setSessionRefreshHandler } from '@/lib/api-client';

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // How long a list nobody is looking at stays in memory. The
            // default five minutes threw away the tables warmed at login
            // before most people had opened them; half an hour of first pages
            // is a few hundred rows.
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  /**
   * The API rejects an access token once the holder's permissions change, and
   * the client's 401 path refreshes transparently. The refreshed token can carry
   * a different grant, so the cached `currentUser` — which every permission
   * check on the client reads — has to be dropped, or the UI keeps offering
   * actions the server has just started refusing.
   */
  useEffect(() => {
    setSessionRefreshHandler(() => queryClient.invalidateQueries({ queryKey: ['currentUser'] }));
    return () => setSessionRefreshHandler(null);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
