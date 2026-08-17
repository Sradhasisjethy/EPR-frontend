import { formatINR } from '@/lib/money';

/**
 * Cell rendering for the reports module.
 *
 * The column *type* decides how a value reads and where it sits — the report
 * definition comes from the server carrying that type, so a rate column is
 * right-aligned and currency-formatted on every report without any report
 * having to say so again. Mirrors the same type vocabulary the backend export
 * renderers use (backend src/api/reports/export/format.js), which is what keeps
 * the screen and the downloaded file describing figures identically.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * DATEONLY values arrive as 'YYYY-MM-DD'. Parsing those with `new Date()` and
 * reading local getters shifts the day backwards for anyone west of UTC, so
 * the string is split directly instead — a business date has no timezone.
 */
export const formatReportDate = (value) => {
  if (!value) return '—';
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return String(value);
  return `${day}-${MONTHS[Number(month) - 1] ?? month}-${year}`;
};

export const formatQuantity = (value) =>
  value === null || value === undefined ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(Number(value));

export const formatInteger = (value) =>
  value === null || value === undefined ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value));

export const formatPercent = (value) =>
  value === null || value === undefined
    ? '—'
    : `${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}%`;

/** PARTIALLY_PAID -> Partially Paid. */
export const humanise = (value) =>
  String(value ?? '')
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const formatCell = (value, column) => {
  if (value === null || value === undefined || value === '') return '—';
  switch (column.type) {
    case 'money':
      return formatINR(value);
    case 'qty':
      return formatQuantity(value);
    case 'int':
      return formatInteger(value);
    case 'percent':
      return formatPercent(value);
    case 'date':
      return formatReportDate(value);
    case 'status':
      return humanise(value);
    default:
      return String(value);
  }
};

export const formatMetric = (value, metric) => formatCell(value, metric);

/** Tailwind alignment for a column, from its declared alignment. */
export const alignClass = (align) => (align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left');

/**
 * Status colouring.
 *
 * Colour is never the only signal — the badge always carries the label as text
 * too — so a report stays readable in monochrome and to a colour-blind reader
 * (§30). Unknown tokens get neutral styling rather than being dropped.
 */
const TONE = {
  positive: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20',
  danger: 'bg-destructive/10 text-destructive ring-destructive/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20',
  neutral: 'bg-muted text-muted-foreground ring-border',
};

const STATUS_TONE = {
  POSTED: 'positive',
  PAID: 'positive',
  RECEIVED: 'positive',
  DISPATCHED: 'positive',
  ACTIVE: 'positive',
  active: 'positive',
  APPROVED: 'positive',
  MATCHED: 'positive',
  IN_STOCK: 'positive',
  FRESH: 'positive',
  'Not due': 'positive',
  RECEIPT: 'positive',

  PARTIALLY_PAID: 'warning',
  PARTIALLY_DISPATCHED: 'warning',
  IN_PRODUCTION: 'warning',
  IN_TRANSIT: 'warning',
  PENDING: 'warning',
  SLOW_MOVING: 'warning',
  BELOW_REORDER: 'warning',
  EXCESS: 'warning',
  HALF_DAY: 'warning',
  '31-60 days': 'warning',
  '1-30 days': 'warning',

  CANCELLED: 'danger',
  UNPAID: 'danger',
  ABSENT: 'danger',
  DEAD: 'danger',
  OUT_OF_STOCK: 'danger',
  DRIFT: 'danger',
  SHORT_CLOSED: 'danger',
  '61-90 days': 'danger',
  '90+ days': 'danger',

  CONFIRMED: 'info',
  DRAFT: 'neutral',
  PAYMENT: 'info',
  OVERTIME: 'info',
  PRESENT: 'positive',
  inactive: 'neutral',
  NOT_REQUIRED: 'neutral',
};

export const statusToneClass = (value) => TONE[STATUS_TONE[value] || 'neutral'];
