import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

/**
 * Server-side pagination controls.
 *
 * The window of page numbers is capped so a 400-page report does not render 400
 * buttons; first/last are always reachable, and the count is stated in words
 * ("Showing 26–50 of 1,240") because "page 2 of 50" alone does not tell a
 * reader how much data they are looking at.
 */

const PAGE_SIZES = [10, 25, 50, 100];

const pageWindow = (page, totalPages, span = 2) => {
  const pages = [];
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  for (let index = start; index <= end; index += 1) pages.push(index);
  return pages;
};

export function ReportPagination({ page, limit, count, totalPages, onPageChange, onLimitChange }) {
  const { glassMode } = useUIStore();
  const from = count === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);
  const pages = pageWindow(page, totalPages);

  const navButton = cn(
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border text-sm transition-colors disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
    glassMode
      ? 'glass-surface border-white/25 text-foreground hover:bg-white/20 dark:hover:bg-white/10'
      : 'border-input hover:bg-muted'
  );

  return (
    <nav className={cn("flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl", glassMode ? "glass-card border border-white/20 dark:border-white/10 shadow-xs" : "")} aria-label="Report pagination">
      <p className={cn("text-sm", glassMode ? "text-foreground/85 font-medium" : "text-muted-foreground")} role="status">
        {count === 0 ? 'No records' : `Showing ${from.toLocaleString('en-IN')}–${to.toLocaleString('en-IN')} of ${count.toLocaleString('en-IN')}`}
      </p>

      <div className="flex items-center gap-3">
        <label className={cn("flex items-center gap-1.5 text-sm", glassMode ? "text-foreground/85 font-medium" : "text-muted-foreground")}>
          <span className="hidden sm:inline">Rows</span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className={cn(
              "h-8 rounded-md border px-1.5 text-sm transition-all",
              glassMode ? "glass-surface border-white/25 text-foreground" : "border-input bg-background"
            )}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size} className="bg-popover text-popover-foreground">
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button type="button" className={navButton} onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page">
            <ChevronsLeft size={15} />
          </button>
          <button type="button" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={15} />
          </button>

          {pages.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              aria-current={value === page ? 'page' : undefined}
              className={cn(navButton, value === page && 'border-primary bg-primary/10 font-medium text-primary')}
            >
              {value}
            </button>
          ))}

          <button type="button" className={navButton} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight size={15} />
          </button>
          <button type="button" className={navButton} onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label="Last page">
            <ChevronsRight size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
