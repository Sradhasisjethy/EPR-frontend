import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Two modes:
 *
 *  - Server mode (preferred, and what usePaginated wires up): pass
 *    `pagination` + `onPaginationChange` + `pageCount`, and `searchValue` +
 *    `onSearchChange` so filtering runs in SQL rather than over one page of
 *    already-fetched rows. Client-side filtering of a server-paginated table
 *    would only ever search the visible page, which is worse than no search.
 *
 *  - Client mode (small, fully-loaded lists): pass `data` + `searchKey` and
 *    the table paginates/filters in the browser.
 *
 * Sorting follows pagination. When the table is server-paginated, sorting must
 * be server-side too: a browser sort reorders only the ten rows currently
 * fetched, so clicking "Name" on page 1 of 40 produces a column that looks
 * sorted and isn't. `sortableColumns` names the columns the API will actually
 * order by (its allow-list lives in utils/pagination.js `toOrder`); any column
 * not listed is left unsortable rather than offering a control that lies.
 */
export function DataTable({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  pagination,
  onPaginationChange,
  pageCount,
  totalCount,
  searchValue,
  onSearchChange,
  isFetching = false,
  // A failed fetch used to fall through to `emptyMessage`, so a 500 or a
  // permission error was indistinguishable from "there is genuinely no data" —
  // the worst possible confusion on a stock or ledger screen. Pass the query's
  // isError (and optionally its refetch) to say what actually happened.
  isError = false,
  onRetry,
  errorMessage = 'Could not load this data.',
  emptyMessage = 'No results.',
  filtersNode,
  actionsNode,
  sorting: serverSorting,
  onSortingChange: onServerSortingChange,
  sortableColumns,
}) {
  const [clientSorting, setClientSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const { glassMode } = useUIStore();

  const manualPagination = !!onPaginationChange;
  const serverSearch = typeof onSearchChange === 'function';
  const showSearch = serverSearch || !!searchKey;
  const manualSorting = typeof onServerSortingChange === 'function';
  const sorting = manualSorting ? serverSorting : clientSorting;
  const setSorting = manualSorting ? onServerSortingChange : setClientSorting;
  const sortableSet = sortableColumns ? new Set(sortableColumns) : null;
  const canSortColumn = (column) => (sortableSet ? sortableSet.has(column.id) : column.getCanSort());

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    onPaginationChange,
    onSortingChange: setSorting,
    manualSorting,
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: manualPagination ? undefined : { pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE } },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(manualPagination ? { pagination } : {}),
    },
  });

  const currentPage = manualPagination ? pagination.pageIndex + 1 : table.getState().pagination.pageIndex + 1;
  const lastPage = manualPagination ? Math.max(pageCount, 1) : table.getPageCount() || 1;
  const rowCount = manualPagination ? totalCount ?? 0 : table.getFilteredRowModel().rows.length;

  const handleSearch = (value) => {
    if (serverSearch) onSearchChange(value);
    else if (searchKey) table.getColumn(searchKey)?.setFilterValue(value);
  };
  const currentSearch = serverSearch ? searchValue ?? '' : (searchKey ? table.getColumn(searchKey)?.getFilterValue() ?? '' : '');

  return (
    <div className="w-full space-y-4">
      {(showSearch || filtersNode || actionsNode) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {showSearch && (
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder={searchPlaceholder || 'Search...'}
                  value={currentSearch}
                  onChange={(event) => handleSearch(event.target.value)}
                  className={cn(
                    'h-9 w-full rounded-md border border-input pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all',
                    glassMode ? 'glass-surface' : 'bg-background'
                  )}
                />
              </div>
            )}
            {filtersNode}
            {actionsNode}
          </div>
          <div className="flex items-center gap-4">
            {isFetching && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Updating…
              </span>
            )}
          </div>
        </div>
      )}

      <div className={cn('rounded-xl border border-border overflow-hidden', glassMode ? 'glass-card' : 'bg-card')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-10 px-4 align-middle font-medium whitespace-nowrap">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center space-x-1',
                            canSortColumn(header.column) ? 'cursor-pointer select-none' : ''
                          )}
                          onClick={canSortColumn(header.column) ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSortColumn(header.column) && (
                            <div className="ml-1">
                              {{
                                asc: <ChevronUp className="h-4 w-4" />,
                                desc: <ChevronDown className="h-4 w-4" />,
                              }[header.column.getIsSorted()] ?? (
                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={cn('h-24 text-center', isError ? 'text-destructive' : 'text-muted-foreground')}
                  >
                    {isError ? (
                      <span className="inline-flex items-center gap-2">
                        {errorMessage}
                        {onRetry && (
                          <button
                            type="button"
                            onClick={onRetry}
                            className="underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            Retry
                          </button>
                        )}
                      </span>
                    ) : isFetching ? (
                      'Loading…'
                    ) : (
                      emptyMessage
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn(
        "flex items-center justify-between py-2 gap-4 flex-wrap",
        glassMode && "glass-card px-4 py-2.5 rounded-xl border border-white/20 dark:border-white/10 shadow-xs"
      )}>
        <p className={cn("text-sm", glassMode ? "text-foreground/85 font-medium" : "text-muted-foreground")}>
          Page {currentPage} of {lastPage} &middot; {rowCount} total
        </p>

        <div className="flex items-center gap-2">
          {manualPagination && (
            <select
              value={pagination.pageSize}
              onChange={(e) => onPaginationChange({ pageIndex: 0, pageSize: Number(e.target.value) })}
              className={cn(
                "h-8 px-2 rounded-md border text-xs transition-all",
                glassMode ? "glass-surface border-white/25 text-foreground" : "border-input bg-background"
              )}
              title="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-popover text-popover-foreground">{n} / page</option>
              ))}
            </select>
          )}
          <button
            className={cn(
              "px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer",
              glassMode
                ? "glass-surface border-white/25 text-foreground hover:bg-white/20 dark:hover:bg-white/10 disabled:opacity-40"
                : "border-input hover:bg-muted disabled:opacity-50"
            )}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </button>
          <button
            className={cn(
              "px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer",
              glassMode
                ? "glass-surface border-white/25 text-foreground hover:bg-white/20 dark:hover:bg-white/10 disabled:opacity-40"
                : "border-input hover:bg-muted disabled:opacity-50"
            )}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className={cn(
              "px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer",
              glassMode
                ? "glass-surface border-white/25 text-foreground hover:bg-white/20 dark:hover:bg-white/10 disabled:opacity-40"
                : "border-input hover:bg-muted disabled:opacity-50"
            )}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
          <button
            className={cn(
              "px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer",
              glassMode
                ? "glass-surface border-white/25 text-foreground hover:bg-white/20 dark:hover:bg-white/10 disabled:opacity-40"
                : "border-input hover:bg-muted disabled:opacity-50"
            )}
            onClick={() => table.setPageIndex(lastPage - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
