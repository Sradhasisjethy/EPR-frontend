import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

const { apiClient } = await import('@/lib/api-client');
const { registerListPrefetch, prefetchLists, registeredListPrefetches } = await import('@/lib/list-prefetch');
// Importing the hook modules is what registers them, exactly as loading a
// page's chunk does in the app.
await import('@/hooks/use-invoicing');
await import('@/hooks/use-factory');

describe('Warming the first page of every table after login', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('registers hand-written and factory-built list hooks with their own key and URL', () => {
    const entries = registeredListPrefetches().map((e) => `${JSON.stringify(e.keyPrefix)} ${e.path}`);
    expect(entries).toContain('["sales-invoices"] /invoices');
    expect(entries).toContain('["factories","list"] /factories');
  });

  it('fills the exact cache entry the page reads on first render', async () => {
    apiClient.get.mockImplementation(async (path) => ({ data: { data: { rows: [{ id: path }], count: 1 } } }));
    const queryClient = new QueryClient();

    await prefetchLists(queryClient);

    // usePaginated's first render asks for page 1 at the default size, and a
    // filter left undefined is dropped from the key — so this is a hit.
    const cached = queryClient.getQueryData(['sales-invoices', { page: 1, limit: 10, factoryId: undefined }]);
    expect(cached).toEqual({ rows: [{ id: '/invoices' }], count: 1 });
    expect(apiClient.get).toHaveBeenCalledWith('/invoices', { params: { page: 1, limit: 10 } });
  });

  it('registers every table from the hooks alone, without waiting for any page to load', async () => {
    const { loadListHooks } = await import('@/lib/list-prefetch');
    await loadListHooks();
    const paths = registeredListPrefetches().map((e) => e.path);
    // A spread across modules, none of which this test imported directly.
    for (const path of ['/parties', '/receipts', '/workforce/advances', '/audit-logs', '/inventory/lots', '/roles']) {
      expect(paths).toContain(path);
    }
    expect(paths.length).toBeGreaterThanOrEqual(55);
  });

  it('does not retry a module the role may not open, and carries on with the rest', async () => {
    registerListPrefetch(['forbidden-thing'], '/forbidden');
    apiClient.get.mockImplementation(async (path) => {
      if (path === '/forbidden') throw Object.assign(new Error('Forbidden'), { response: { status: 403 } });
      return { data: { data: { rows: [], count: 0 } } };
    });
    const queryClient = new QueryClient();

    await prefetchLists(queryClient);

    expect(apiClient.get.mock.calls.filter(([path]) => path === '/forbidden')).toHaveLength(1);
    expect(queryClient.getQueryData(['factories', 'list', { page: 1, limit: 10 }])).toEqual({ rows: [], count: 0 });
  });
});
