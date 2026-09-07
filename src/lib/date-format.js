/**
 * Renders a date the way the tenant asked for it in Settings > General.
 *
 * The setting was saved and read back into its own dropdown, and nothing else
 * in the app ever asked what it was. Dates were rendered four different ways
 * depending on the call site: 38 table columns printed the raw API value
 * ("2026-09-04"), a handful used toLocaleString() and so followed the
 * *browser's* locale and timezone, and four used a formatDate() pinned to
 * en-US. Changing the setting changed none of them.
 *
 * Mirrors src/utils/dateDisplay.js in the API, which formats the same dates on
 * printed documents. The two must agree, so both implement the three patterns
 * literally rather than deriving them from a locale.
 */

const PATTERNS = {
  'DD/MM/YYYY': ({ dd, mm, yyyy }) => `${dd}/${mm}/${yyyy}`,
  'MM/DD/YYYY': ({ dd, mm, yyyy }) => `${mm}/${dd}/${yyyy}`,
  'YYYY-MM-DD': ({ dd, mm, yyyy }) => `${yyyy}-${mm}-${dd}`,
};

export const DEFAULT_DATE_FORMAT = 'DD/MM/YYYY';

/**
 * A DATEONLY column arrives as "2026-09-04" and is already the calendar date
 * that was meant. Parsing it into an instant and reading it back in another
 * zone can move it a day — on a dispatch date that is a different business day,
 * on an invoice a different GST return period — so a plain date string is taken
 * apart textually and never touches a timezone. Timestamps really do denote an
 * instant, so those are converted.
 */
const partsOf = (value, timeZone) => {
  if (value === null || value === undefined || value === '') return null;

  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (plain) {
    const [, yyyy, mm, dd] = plain;
    return { yyyy, mm, dd, plain: true };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const [yyyy, mm, dd] = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(date)
      .split('-');
    return { yyyy, mm, dd, date };
  } catch {
    // An unknown timezone must not blank out the screen.
    return {
      yyyy: String(date.getFullYear()),
      mm: String(date.getMonth() + 1).padStart(2, '0'),
      dd: String(date.getDate()).padStart(2, '0'),
      date,
    };
  }
};

/** @returns the formatted date, or '' for anything that is not one. */
export function formatDate(value, { dateFormat, timeZone } = {}) {
  const parts = partsOf(value, timeZone);
  if (!parts) return '';
  return (PATTERNS[dateFormat] || PATTERNS[DEFAULT_DATE_FORMAT])(parts);
}

/**
 * Date plus clock time, for audit trails and notifications where the moment
 * matters. A plain calendar date has no time to show, so it renders as a date.
 */
export function formatDateTime(value, { dateFormat, timeZone } = {}) {
  const parts = partsOf(value, timeZone);
  if (!parts) return '';
  const day = (PATTERNS[dateFormat] || PATTERNS[DEFAULT_DATE_FORMAT])(parts);
  if (parts.plain) return day;

  let time;
  try {
    time = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || undefined,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parts.date);
  } catch {
    time = `${String(parts.date.getHours()).padStart(2, '0')}:${String(parts.date.getMinutes()).padStart(2, '0')}`;
  }
  return `${day} ${time}`;
}

/**
 * The tenant's current calendar date as "YYYY-MM-DD".
 *
 * Every date-defaulting form used `new Date().toISOString().slice(0, 10)`,
 * which is the *UTC* date. At UTC+05:30 that is yesterday for the first five
 * and a half hours of every day, so a production run keyed at 01:00 was filed
 * to the previous day — and the dashboard, asking the same way, then reported
 * nothing produced.
 */
export function todayInZone(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    // An unknown timezone must not stop a form opening.
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Cached tenant preferences, so `today()` can be called from module scope and
 * from plain object literals where a React hook cannot go. Kept current by
 * useDatePreferences, which every screen mounts through <DateText>; the
 * fallback until it loads is the browser's own date, which is right for
 * everyone working in the plant's own timezone.
 */
let cachedPreferences = {};

export function setCachedDatePreferences(preferences) {
  cachedPreferences = preferences || {};
}

/** Today, in the tenant's timezone. Call at the moment a form opens. */
export function today() {
  return todayInZone(cachedPreferences.timeZone);
}
