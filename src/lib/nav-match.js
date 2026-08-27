import { NAVIGATION } from '@/constants/navigation';

// Query params that identify a destination rather than filter one. Two leaves can
// share a route and differ only by these (Sales > Returns vs Purchase > Returns),
// so they have to take part in active-link matching.
export const NAV_PARAMS = ['report'];

export const routeKey = (pathname, search) => {
  const params = new URLSearchParams(search);
  return [pathname, ...NAV_PARAMS.map((param) => params.get(param) || '')].join('|');
};

export const hrefKey = (href) => {
  const [pathname, search = ''] = String(href).split('?');
  return routeKey(pathname, search);
};

/**
 * Does a nav href own the current location, counting routes nested under it?
 *
 * The Reports module is nested (`/reports/sales` opens onto
 * `/reports/sales/summary`), so an exact-match-only rule would leave the
 * sidebar unhighlighted and the breadcrumb blank the moment a report is
 * chosen. The trailing slash is load-bearing: without it `/reports/sales`
 * would also claim a hypothetical `/reports/sales-archive`.
 *
 * Hrefs carrying a query string are excluded — those identify a specific tab of
 * a shared page, and a tab does not own paths beneath it.
 */
export const ownsPath = (href, pathname) => {
  if (!href || href.includes('?')) return false;
  const base = href.split('?')[0];
  return base !== '/' && pathname.startsWith(`${base}/`);
};

/** True when this nav item should render as the active link. */
export const isNavHrefActive = (href, pathname, search) =>
  !!href && (hrefKey(href) === routeKey(pathname, search) || ownsPath(href, pathname));

/**
 * Where the current URL sits in the sidebar tree, as ['Sales', 'Sales Invoices'].
 * Falls back to a path-only match so a route reached from inside a page (a tab the
 * sidebar doesn't link, say) still resolves to its module instead of going blank.
 */
export function findNavTrail(pathname, search) {
  const target = routeKey(pathname, search);

  // Several leaves deliberately point at one route (Purchase > Vendor Ledger and
  // Sales > Customer Ledger are the same screen). Aliases still highlight in the
  // sidebar, but the leaf marked canonical is the one that names the page.
  // A canonical prefix match outranks an alias exact match for the same reason:
  // Reports > Stock Ageing should name /reports/ageing/stock-ageing, not the
  // Inventory alias that shortcuts to it.
  const matchers = [
    (c) => !c.alias && hrefKey(c.href) === target,
    (c) => !c.alias && ownsPath(c.href, pathname),
    (c) => hrefKey(c.href) === target,
    (c) => ownsPath(c.href, pathname),
    (c) => !c.alias && c.href.split('?')[0] === pathname,
    (c) => c.href.split('?')[0] === pathname,
  ];

  for (const matches of matchers) {
    for (const item of NAVIGATION) {
      if (item.href && matches(item)) return [item.title];
      const child = item.children?.find((c) => c.href && matches(c));
      if (child) return [item.title, child.title];
    }
  }

  return [];
}
