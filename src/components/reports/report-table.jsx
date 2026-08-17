import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { alignClass, formatCell, statusToneClass } from '@/lib/report-format';

/**
 * The one table every report renders through.
 *
 * It takes the column list the *server* returned rather than a locally-declared
 * one, which is what makes field-level permissions real: a column the caller
 * may not see never arrives, so there is nothing here to accidentally render.
 *
 * Sorting is server-side. Clicking a header changes the query, it does not
 * reorder the page in the browser — reordering 25 of 4,000 rows would be a lie.
 * Only columns the report declared sortable are clickable.
 */

function SortIndicator({ state }) {
  if (state === 'asc') return <ArrowUp size={13} aria-hidden="true" />;
  if (state === 'desc') return <ArrowDown size={13} aria-hidden="true" />;
  return <ChevronsUpDown size={13} className="text-muted-foreground/40" aria-hidden="true" />;
}

function Cell({ row, column }) {
  const value = row[column.key];

  if (column.type === 'status') {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
    return (
      <span
        className={cn(
          'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
          statusToneClass(value)
        )}
      >
        {formatCell(value, column)}
      </span>
    );
  }

  const text = formatCell(value, column);
  const isBlank = text === '—';

  return (
    <span
      className={cn(
        isBlank && 'text-muted-foreground',
        // Numbers line up only in a fixed-width face; names read better in the
        // body face, so the two get different treatment rather than one
        // compromise for both.
        ['money', 'qty', 'int', 'percent'].includes(column.type) && 'tabular-nums',
        column.type === 'code' && 'font-medium',
        column.type === 'text' && 'block max-w-[22rem] truncate'
      )}
      title={column.type === 'text' && !isBlank ? text : undefined}
    >
      {text}
    </span>
  );
}

export function ReportTable({ columns, rows, sort, onSortChange, isFetching }) {
  const sortStateFor = (key) => (sort?.by === key ? sort.dir : null);

  const toggleSort = (column) => {
    if (!column.sortable) return;
    const current = sortStateFor(column.key);
    // First click on a new column sorts descending for numbers (biggest first
    // is what a reader wants from an amount) and ascending for everything else.
    const nextDir = current === 'asc' ? 'desc' : current === 'desc' ? 'asc' : ['money', 'qty', 'int', 'percent', 'date'].includes(column.type) ? 'desc' : 'asc';
    onSortChange({ by: column.key, dir: nextDir });
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card transition-opacity', isFetching && 'opacity-60')}>
      {/* Wide reports scroll inside this container; the page itself never
          scrolls sideways. max-h keeps the sticky header useful on long pages. */}
      <div className="overflow-auto max-h-[calc(100vh-22rem)] rounded-xl">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              {columns.map((column) => {
                const state = sortStateFor(column.key);
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : column.sortable ? 'none' : undefined}
                    className={cn(
                      'whitespace-nowrap border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                      alignClass(column.align)
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          column.align === 'right' && 'flex-row-reverse',
                          state && 'text-foreground'
                        )}
                      >
                        {column.header}
                        <SortIndicator state={state} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? index} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/40">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('whitespace-nowrap px-3 py-2.5 align-middle', alignClass(column.align))}
                  >
                    <Cell row={row} column={column} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
