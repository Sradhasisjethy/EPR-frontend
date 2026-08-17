import { useEffect, useRef, useState } from 'react';
import { Columns3, Download, FileSpreadsheet, FileText, RotateCcw, Search, SlidersHorizontal, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFilters } from './report-filters';
import { ReportBusy } from './report-states';

/**
 * Search, filters, column visibility and export.
 *
 * Search is debounced and sent to the server — filtering the 25 rows already on
 * screen would only ever search the visible page, which is worse than no search
 * at all on a 4,000-row report.
 *
 * The layout follows the reading order of the screen: what you are looking at,
 * how to narrow it, then how to take it away. Secondary filters collapse behind
 * "More filters" so the resting state is one row of controls.
 */

function useDebouncedCallback(callback, delay) {
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (value) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => callback(value), delay);
  };
}

function ColumnMenu({ columns, hidden, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const hiddenCount = columns.filter((c) => hidden.includes(c.key)).length;

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true">
        <Columns3 size={15} /> Columns
        {hiddenCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({columns.length - hiddenCount})</span>}
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 max-h-80 w-60 overflow-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">Visible columns</span>
            <button type="button" onClick={onReset} className="text-xs text-primary hover:underline">
              Reset
            </button>
          </div>
          {columns.map((column) => (
            <label
              key={column.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={!hidden.includes(column.key)}
                onChange={() => onToggle(column.key)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span className="truncate">{column.header}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportToolbar({
  report,
  search,
  onSearchChange,
  filterValues,
  onFilterChange,
  onApply,
  onReset,
  columns,
  hiddenColumns,
  onToggleColumn,
  onResetColumns,
  onExport,
  exporting,
  isFetching,
}) {
  const [searchDraft, setSearchDraft] = useState(search ?? '');
  const [showMore, setShowMore] = useState(false);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 350);

  // Keep the box in step when the URL changes underneath us (a shared link, or
  // the Reset button) without fighting the user while they are typing.
  useEffect(() => {
    setSearchDraft(search ?? '');
  }, [search]);

  const controls = report.filterControls || [];
  // How many filters are actually set — drives the badge on "More filters", so
  // a filter hidden behind that button still announces itself.
  const countActiveFilters = (list, values) =>
    list.filter((control) => values[control.key] !== undefined && values[control.key] !== '').length;
  const secondary = controls.filter((control) => !control.primary);
  const activeCount = countActiveFilters(controls, filterValues);
  const searchable = (report.searchFields || []).length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative min-w-[16rem] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                debouncedSearch(event.target.value);
              }}
              placeholder={`Search ${report.searchFields.join(', ')}`}
              aria-label={`Search ${report.name}`}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isFetching && <ReportBusy label="Updating…" className="mr-1" />}

          {secondary.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
              <SlidersHorizontal size={15} /> More filters
              {activeCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">{activeCount}</span>
              )}
            </Button>
          )}

          {columns.length > 0 && (
            <ColumnMenu columns={columns} hidden={hiddenColumns} onToggle={onToggleColumn} onReset={onResetColumns} />
          )}

          {/* Export is offered only when the server said this user may export
              (report.canExport), so the button is never a dead end. */}
          {report.canExport && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => onExport('xlsx')} disabled={!!exporting}>
                {exporting === 'xlsx' ? <ReportBusy label="Preparing Excel…" /> : (<><FileSpreadsheet size={15} /> Excel</>)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport('pdf')} disabled={!!exporting}>
                {exporting === 'pdf' ? <ReportBusy label="Preparing PDF…" /> : (<><FileText size={15} /> PDF</>)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport('csv')} disabled={!!exporting} title="Comma-separated values">
                {exporting === 'csv' ? <ReportBusy label="Preparing CSV…" /> : (<><Table2 size={15} /> CSV</>)}
              </Button>
            </div>
          )}
        </div>
      </div>

      {controls.length > 0 && (
        <>
          <ReportFilters controls={controls} values={filterValues} onChange={onFilterChange} showSecondary={showMore} />

          <div className="flex items-center gap-2 pt-0.5">
            <Button size="sm" onClick={onApply}>
              Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset} disabled={activeCount === 0 && !search}>
              <RotateCcw size={14} /> Reset
            </Button>
            <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
              <Download size={12} className="mr-1 inline" aria-hidden="true" />
              Exports use these filters and include every matching row.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
