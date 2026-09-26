import { apiClient } from '@/lib/api-client';

/**
 * Fetches the first page of every list screen in the background after login,
 * so opening a module for the first time shows its table at once instead of a
 * skeleton while the request is in flight.
 *
 * Why this exists: react-query keeps a list once it has been fetched, which is
 * why a module opened a second time was instant and the first time was not.
 * The first visit always paid a full round trip to the API. Warming those
 * first pages while the user is still on the dashboard moves that wait to a
 * moment nobody is looking at.
 *
 * Each list hook registers itself here (see createResourceHooks and the
 * hand-written hooks), so the prefetch uses the hook's own query key and URL.
 * A prefetched entry is exactly the entry the page reads — nothing is kept in
 * sync by hand, and a hook that changes its key changes its prefetch with it.
 *
 * The params match what usePaginated asks for on first render: page 1 at the
 * default page size, no search, no sort. A page that opens with a filter
 * preset simply misses and fetches as it always did.
 */

const FIRST_PAGE = Object.freeze({ page: 1, limit: 10 });
// Six at a time: enough that ~60 lists are warm within a second or two of
// login, few enough that the dashboard's own requests are never stuck behind
// them in the browser's six-connections-per-host queue for long.
const BATCH = 6;

/**
 * Every hooks module, so the lists register without waiting for the pages
 * that use them. Before, the warm-up waited until every page's code had
 * downloaded, because loading a page is what imported its hooks — so the data
 * started last. Hook modules are small and most are in the main bundle
 * already, so importing them all is nearly free.
 */
const hookModules = import.meta.glob(['../hooks/use-*.js', '!../hooks/*.test.js']);

export const loadListHooks = () => Promise.allSettled(Object.values(hookModules).map((load) => load()));
const registry = new Map();

/**
 * @param {unknown[]} keyPrefix the hook's query key without the trailing params
 * @param {string} path the GET endpoint the hook reads
 */
export function registerListPrefetch(keyPrefix, path) {
  registry.set(JSON.stringify(keyPrefix), { keyPrefix, path });
}

const whenIdle = (fn) =>
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback(fn, { timeout: 2000 })
    : setTimeout(fn, 200);

let running = null;

/**
 * Warms every registered list, a few requests at a time and only while the
 * browser is idle, so the screen the user is actually looking at never queues
 * behind a prefetch. Lists already in the cache and still fresh are skipped by
 * react-query itself. Resolves when every batch has settled.
 */
export function prefetchLists(queryClient) {
  if (running) return running;
  running = new Promise((resolve) => {
    const queue = [...registry.values()];
    const next = () => {
      const batch = queue.splice(0, BATCH);
      if (!batch.length) {
        running = null;
        resolve();
        return;
      }
      Promise.allSettled(
        batch.map(({ keyPrefix, path }) =>
          queryClient.prefetchQuery({
            queryKey: [...keyPrefix, FIRST_PAGE],
            queryFn: async () => (await apiClient.get(path, { params: FIRST_PAGE })).data.data,
            // A module this role cannot open answers 403. Retrying that would
            // only repeat the refusal; the page is unreachable for them anyway.
            retry: false,
          })
        )
      ).then(() => whenIdle(next));
    };
    whenIdle(next);
  });
  return running;
}

/** For tests. */
export const registeredListPrefetches = () => [...registry.values()];
