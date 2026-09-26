import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Wrench } from 'lucide-react';
import { useReportCatalog, useReportData, useReportExport, useReportMeta, readExportError } from '@/hooks/use-report-catalog';
import { ReportCategoryTabs, ReportLimitations, ReportPicker } from '@/components/reports/report-nav';
import { ReportToolbar } from '@/components/reports/report-toolbar';
import { ReportSummary } from '@/components/reports/report-summary';
import { ReportTable } from '@/components/reports/report-table';
import { ReportPagination } from '@/components/reports/report-pagination';
import { ReportEmptyState, ReportErrorState, ReportSummarySkeleton, ReportTableSkeleton } from '@/components/reports/report-states';
import { PageDescription } from '@/components/layout/page-description';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

/**
 * The Reports module.
 *
 * One route tree — /reports/:category/:report — over a catalog the server
 * publishes. Nothing about a report is declared here: its columns, filters,
 * summary tiles and export rights all arrive from the API, already reduced to
 * what the signed-in user is allowed to receive.
 *
 * Filter state lives in the URL rather than in component state, so a report
 * with a date range and a customer selected can be bookmarked or pasted to a
 * colleague and reopen exactly as it was (§27). Anyone opening that link still
 * gets their own permissions and their own locations — the URL carries the
 * question, not the answer.
 */

/** Query keys that are report state rather than filters. */
const CONTROL_KEYS = ['page', 'limit', 'search', 'sortBy', 'sortDir', 'cols'];

const DEFAULT_LIMIT = 25;

export default function ReportsPage() {
  const { category: categoryParam, report: reportParam } = useParams();
  const catalog = useReportCatalog();

  const categories = catalog.data?.categories || [];
  const category = categories.find((c) => c.id === categoryParam);

  if (catalog.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <ReportSummarySkeleton />
        <ReportTableSkeleton />
      </div>
    );
  }

  if (catalog.isError) {
    return <ReportErrorState error={catalog.error} onRetry={() => catalog.refetch()} />;
  }

  if (!categories.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="text-sm font-medium">No reports are available to you.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports are granted per category. Ask an administrator for the report permissions you need.
        </p>
      </div>
    );
  }

  // Landing on /reports, or on a category with no report chosen, resolves to
  // the first thing the user can actually open rather than an empty shell.
  if (!categoryParam) return <Navigate to={`/reports/${categories[0].id}`} replace />;
  if (!category) return <Navigate to={`/reports/${categories[0].id}`} replace />;
  if (!reportParam) return <Navigate to={`/reports/${category.id}/${category.reports[0].slug}`} replace />;

  return (
    <ReportsWorkspace
      categories={categories}
      category={category}
      categoryId={categoryParam}
      reportSlug={reportParam}
    />
  );
}

function ReportsWorkspace({ categories, category, categoryId, reportSlug }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const meta = useReportMeta(categoryId, reportSlug);
  const exportMutation = useReportExport();
  const [exporting, setExporting] = useState(null);

  const definition = meta.data;

  // --- URL-backed state ----------------------------------------------------
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Number(searchParams.get('limit')) || DEFAULT_LIMIT;
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortDir = searchParams.get('sortDir') || undefined;
  const hiddenColumns = useMemo(() => (searchParams.get('cols') || '').split(',').filter(Boolean), [searchParams]);

  /** Only the filter keys this report actually declares reach the request. */
  const filterValues = useMemo(() => {
    const values = {};
    for (const control of definition?.filterControls || []) {
      const value = searchParams.get(control.key);
      if (value !== null && value !== '') values[control.key] = value;
    }
    return values;
  }, [definition, searchParams]);

  const updateParams = useCallback(
    (changes, { resetPage = true } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          }
          // Any change to what is being asked for invalidates the page number:
          // staying on page 5 of a result set that now has two pages shows an
          // empty table and looks like missing data.
          if (resetPage && !('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      ...(search ? { search } : {}),
      ...(sortBy ? { sortBy, sortDir: sortDir || 'desc' } : {}),
      ...filterValues,
    }),
    [page, limit, search, sortBy, sortDir, filterValues]
  );

  const data = useReportData(categoryId, reportSlug, queryParams, { enabled: Boolean(definition) });

  // Columns the user chose to hide are removed here, not requested away: the
  // server already decided which columns exist, and hiding one locally must not
  // change the totals or what an export contains.
  const visibleColumns = useMemo(
    () => (data.data?.columns || definition?.columns || []).filter((column) => !hiddenColumns.includes(column.key)),
    [data.data, definition, hiddenColumns]
  );

  // Columns a report marks hidden-by-default start hidden the first time it is
  // opened, without touching a URL the user may have shared.
  const [defaultsApplied, setDefaultsApplied] = useState(null);
  useEffect(() => {
    if (!definition || defaultsApplied === definition.id) return;
    setDefaultsApplied(definition.id);
    if (searchParams.has('cols')) return;
    const hiddenByDefault = definition.columns.filter((c) => c.hidden).map((c) => c.key);
    if (hiddenByDefault.length) updateParams({ cols: hiddenByDefault.join(',') }, { resetPage: false });
  }, [definition, defaultsApplied, searchParams, updateParams]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const filename = await exportMutation.mutateAsync({
        category: categoryId,
        report: reportSlug,
        params: { ...queryParams, page: undefined, limit: undefined },
        format,
      });
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(await readExportError(error));
    } finally {
      setExporting(null);
    }
  };

  const resetAll = () =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams();
        // Column visibility is a display preference, not a filter, so Reset
        // leaves it alone.
        const cols = previous.get('cols');
        if (cols) next.set('cols', cols);
        return next;
      },
      { replace: true }
    );

  const toggleColumn = (key) => {
    const next = hiddenColumns.includes(key) ? hiddenColumns.filter((c) => c !== key) : [...hiddenColumns, key];
    updateParams({ cols: next.join(',') }, { resetPage: false });
  };

  if (meta.isError) {
    return (
      <div className="space-y-6">
        <ReportHeader categories={categories} category={category} reportSlug={reportSlug} />
        <ReportErrorState error={meta.error} onRetry={() => meta.refetch()} />
      </div>
    );
  }

  const result = data.data;
  const isFirstLoad = data.isLoading || !definition;
  const hasFilters = Object.keys(filterValues).length > 0 || Boolean(search);

  return (
    <div className="space-y-5">
      <ReportHeader categories={categories} category={category} reportSlug={reportSlug} definition={definition} />

      {definition && (
        <ReportToolbar
          report={definition}
          search={search}
          onSearchChange={(value) => updateParams({ search: value })}
          filterValues={filterValues}
          onFilterChange={(key, value) => updateParams({ [key]: value })}
          onApply={() => data.refetch()}
          onReset={resetAll}
          columns={definition.columns}
          hiddenColumns={hiddenColumns}
          onToggleColumn={toggleColumn}
          onResetColumns={() => updateParams({ cols: '' }, { resetPage: false })}
          onExport={handleExport}
          exporting={exporting}
          isFetching={data.isFetching && !data.isLoading}
        />
      )}

      <ReportLimitations limitations={definition?.limitations} />

      {isFirstLoad ? (
        <>
          <ReportSummarySkeleton tiles={definition?.summary?.length || 4} />
          <ReportTableSkeleton columns={Math.min(definition?.columns?.length || 6, 8)} />
        </>
      ) : data.isError ? (
        <ReportErrorState error={data.error} onRetry={() => data.refetch()} />
      ) : (
        <>
          <ReportSummary metrics={result.metrics} summary={result.summary} trends={result.summary?.trends} />

          {definition.kind === 'kpi' ? (
            <p className="text-sm text-muted-foreground">
              This report is a summary only — the figures above cover the selected period and locations.
            </p>
          ) : result.rows.length === 0 ? (
            <ReportEmptyState hasFilters={hasFilters} onReset={resetAll} />
          ) : (
            <>
              <ReportTable
                columns={visibleColumns}
                rows={result.rows}
                sort={result.sort}
                onSortChange={({ by, dir }) => updateParams({ sortBy: by, sortDir: dir })}
                isFetching={data.isFetching && !data.isLoading}
              />
              <ReportPagination
                page={result.page}
                limit={result.limit}
                count={result.count}
                totalPages={result.totalPages}
                onPageChange={(value) => updateParams({ page: value }, { resetPage: false })}
                onLimitChange={(value) => updateParams({ limit: value })}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function ReportHeader({ categories, category, reportSlug, definition }) {
  const listed = category.reports.find((r) => r.slug === reportSlug);
  const { glassMode } = useUIStore();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageDescription>Operational and financial reporting across every module</PageDescription>
        <Link
          to="/reports/saved"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 glass-card transition-all hover:bg-primary hover:text-primary-foreground shadow-xs"
        >
          <Wrench size={14} /> Saved report builder
        </Link>
      </div>

      <ReportCategoryTabs categories={categories} activeCategory={category.id} />
      <ReportPicker category={category} activeReport={reportSlug} />

      <div className={cn(
        "transition-all",
        glassMode ? "glass-card p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-xs" : ""
      )}>
        <h3 className="text-lg font-bold text-foreground tracking-tight">{definition?.name || listed?.name || 'Report'}</h3>
        {(definition?.description || listed?.description) && (
          <p className={cn("text-sm mt-1", glassMode ? "text-foreground/80 font-medium" : "text-muted-foreground")}>
            {definition?.description || listed?.description}
          </p>
        )}
      </div>
    </div>
  );
}
