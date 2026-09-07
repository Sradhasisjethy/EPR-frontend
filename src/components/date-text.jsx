import { useSettings } from '@/hooks/use-settings';
import { useEffect } from 'react';
import { formatDate, formatDateTime, setCachedDatePreferences } from '@/lib/date-format';

/**
 * Every date the app displays, rendered the way Settings > General says.
 *
 * A component rather than a hook because most dates live inside table column
 * definitions — plain objects, not components, so they cannot call a hook. This
 * renders inside the cell instead, which also means every date on screen
 * re-renders by itself when the setting changes, with no page needing to know.
 *
 * The query is shared with every other caller by react-query's cache, so a
 * table of 50 rows costs one request, not fifty.
 */
export function useDatePreferences() {
  const { data } = useSettings('general');
  const rows = Array.isArray(data) ? data : [];
  const value = (key) => {
    const row = rows.find((r) => r.key === key);
    return typeof row?.value === 'string' ? row.value : undefined;
  };
  const preferences = { dateFormat: value('dateFormat'), timeZone: value('timezone') };

  // Mirrored into the module cache so today() — called from form defaults and
  // plain object literals, where a hook cannot go — sees the same setting.
  useEffect(() => setCachedDatePreferences(preferences), [preferences.dateFormat, preferences.timeZone]);

  return preferences;
}

export function DateText({ value, withTime = false, fallback = '—' }) {
  const preferences = useDatePreferences();
  const text = withTime ? formatDateTime(value, preferences) : formatDate(value, preferences);
  return text || fallback;
}
