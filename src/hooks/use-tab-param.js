import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Slug used in the URL for a tab. Pages keep their own tab keys ('Report Builder',
 * 'SALES_REF', 'financial-years') — only the query string is normalised, so links
 * read as `/reports?tab=report-builder` instead of `?tab=Report%20Builder`.
 */
export const tabSlug = (tab) =>
  String(tab ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Drop-in replacement for `useState(defaultTab)` on pages with in-page tabs, backed
 * by `?tab=` instead of local state. This is what lets the grouped sidebar point at
 * a specific tab of a shared page (Sales > Returns and Purchase > Returns are both
 * /returns, on different tabs).
 *
 * Unknown or missing slugs fall back to `defaultTab`, so a stale bookmark degrades
 * to the page's normal landing tab rather than an empty screen.
 */
export function useTabParam(tabs, defaultTab = tabs[0], paramName = 'tab') {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(paramName);
  const matched = raw === null ? undefined : tabs.find((tab) => tabSlug(tab) === raw.toLowerCase());
  const activeTab = matched === undefined ? defaultTab : matched;

  const setActiveTab = useCallback(
    (tab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const slug = tabSlug(tab);
          // Keep the default tab param-free so the canonical URL stays clean.
          if (!slug || tab === defaultTab) next.delete(paramName);
          else next.set(paramName, slug);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaultTab, paramName]
  );

  return [activeTab, setActiveTab];
}
