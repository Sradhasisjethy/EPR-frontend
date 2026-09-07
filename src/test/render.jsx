import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Renders a component with a react-query client, which almost everything here
 * needs.
 *
 * Retries are off: a component that fails to fetch should say so immediately in
 * a test rather than three retries later, and a failing query is usually the
 * thing being asserted.
 */
export function renderWithQuery(ui, { client } = {}) {
  const queryClient =
    client ||
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}
