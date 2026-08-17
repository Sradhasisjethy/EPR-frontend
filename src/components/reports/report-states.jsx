import { AlertTriangle, FileSearch, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Loading, empty and error states for a report.
 *
 * They are one component set rather than three ad-hoc blocks per report because
 * the failure modes are identical everywhere: a slow query, filters that match
 * nothing, and a request that was refused. Sharing them also means a report
 * screen is never blank while it thinks.
 */

/**
 * A skeleton shaped like the table it is replacing — same column count, same
 * row height — so the layout does not jump when the data lands.
 */
export function ReportTableSkeleton({ columns = 6, rows = 8 }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading report data</span>
      <div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-3 flex-1 rounded bg-muted-foreground/20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-b border-border/50 px-4 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={index}
              className="h-3 flex-1 rounded bg-muted animate-pulse"
              style={{ animationDelay: `${(rowIndex * columns + index) * 18}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ReportSummarySkeleton({ tiles = 4 }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: tiles }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-3.5">
          <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
          <div className="mt-2.5 h-5 w-24 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ReportEmptyState({ hasFilters, onReset }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <FileSearch className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">No data found for the selected filters.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters ? 'Try widening the date range or clearing a filter.' : 'Nothing has been recorded for this report yet.'}
      </p>
      {hasFilters && onReset && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
          Reset filters
        </Button>
      )}
    </div>
  );
}

export function ReportErrorState({ error, onRetry }) {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.message ||
    (status === 403
      ? 'You do not have permission to view this report.'
      : 'Unable to load this report.');

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-destructive">{message}</p>
      {status !== 403 && onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw size={14} /> Retry
        </Button>
      )}
    </div>
  );
}

/** Inline "working…" marker that never blocks the surrounding controls. */
export function ReportBusy({ label, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)} role="status">
      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}
