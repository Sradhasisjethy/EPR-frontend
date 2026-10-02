import { cn } from '@/lib/utils';

export function StatusBadge({ status }) {
  const styles = {
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', pulse: true },
    inactive: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },
    onboarding: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    terminated: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    suspended: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },

    // Procurement, Purchasing, Sales & Order lifecycle statuses
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    converted: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    'pending approval': { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', pulse: true },
    pending_approval: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', pulse: true },
    draft: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },
    confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'in production': { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', pulse: true },
    in_production: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', pulse: true },
    'partially dispatched': { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    partially_dispatched: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    dispatched: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'short closed': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    short_closed: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    'short-closed': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    received: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    partially_received: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    'partially received': { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    posted: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    unpaid: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    partially_paid: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    'partially paid': { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },

    // Inventory Lot lifecycle statuses
    curing: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', pulse: true },
    available: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'with contractor': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    with_contractor: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    'in transit': { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
    in_transit: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
    consumed: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },

    // Quality verdicts. FAIL is red rather than orange because a failed lot is
    // quarantined stock, not a warning about one.
    PASS: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    FAIL: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', pulse: true },
    QC_HOLD: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', pulse: true },
    QC_FAILED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  };

  const key = String(status || '').toLowerCase().trim();
  const style = styles[status] || styles[key] || styles[key.replace(/_/g, ' ')] || styles[key.replace(/-/g, ' ')] || styles.inactive;

  // Enum-shaped statuses (QC_HOLD, IN_PRODUCTION) read as Title Case words.
  const label = /^[A-Z_]+$/.test(status)
    ? status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent shadow-sm", style.bg, style.text)}>
      <span className="relative flex h-2 w-2 mr-1.5">
        {style.pulse && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", style.dot)}></span>
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", style.dot)}></span>
      </span>
      {label}
    </span>
  );
}
