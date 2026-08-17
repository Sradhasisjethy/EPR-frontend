import { useState, useMemo, useEffect, useRef } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Drives any list screen against the backend's shared list contract
 * (page/limit/search -> { rows, count, page, limit, totalPages }).
 *
 * Server-side paging is the default everywhere because several of these tables
 * grow without bound (stock ledger, audit log, invoices) — fetching every row
 * to paginate in the browser stops working long before the data does.
 *
 * @param {(params: object) => object} useListHook - a react-query list hook
 * @param {object} filters - module-specific filters (factoryId, status, ...)
 */
export function usePaginated(useListHook, filters = {}, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  // Any filter or search change invalidates the current page number — staying
  // on page 5 of a result set that now has two pages shows an empty table.
  const filterKey = JSON.stringify(filters);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filterKey, debouncedSearch]);

  const params = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...filters,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, filterKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const query = useListHook(params);

  return {
    query,
    rows: query.data?.rows || [],
    tableProps: {
      data: query.data?.rows || [],
      pagination,
      onPaginationChange: setPagination,
      pageCount: query.data?.totalPages ?? 0,
      totalCount: query.data?.count ?? 0,
      searchValue: search,
      onSearchChange: setSearch,
      isFetching: query.isFetching,
    },
  };
}

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
