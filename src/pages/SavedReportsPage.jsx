import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Play, Trash2, Save, Search, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useSavedReports, useCreateSavedReport, useDeleteSavedReport, useRunReport, useRunSavedReport, useExportReport } from '@/hooks/use-reports';
import { useDocumentSearch } from '@/hooks/use-analytics';
import { ReportTypes, WebPermissions } from '@/constants/enums';
import { usePermissions } from '@/hooks/use-permissions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTabParam } from '@/hooks/use-tab-param';
import { DateText } from '@/components/date-text';
import { PageDescription } from '@/components/layout/page-description';
import { useUIStore } from '@/store/ui-store';

/**
 * The M40 saved-report builder and document search.
 *
 * The catalogued Reports module at /reports supersedes this for day-to-day
 * reporting, but it is kept rather than deleted for two reasons: saved reports
 * users have already created still run from here, and document search — finding
 * a document by its number across every module — has no equivalent in the
 * catalogue, which is organised by subject rather than by document number.
 */

const TABS = ['Report Builder', 'Document Search'];

const REPORT_TYPES = Object.values(ReportTypes);

// Which params each report type actually needs — drives the dynamic form below.
const PARAM_FIELDS = {
  [ReportTypes.STOCK_AGEING]: ['factoryId', 'deadStockDays'],
  [ReportTypes.DASHBOARD_KPIS]: ['factoryId', 'fromDate', 'toDate'],
  [ReportTypes.COSTING]: ['factoryId'],
  [ReportTypes.ALERTS]: ['factoryId'],
  [ReportTypes.CANCELLATION_ANALYTICS]: ['factoryId', 'fromDate', 'toDate'],
  [ReportTypes.DOCUMENT_SEARCH]: ['q'],
  [ReportTypes.TRIAL_BALANCE]: ['factoryId'],
  [ReportTypes.PARTY_LEDGER]: ['partyId'],
  [ReportTypes.CASH_BOOK]: ['factoryId', 'from', 'to', 'accountKey'],
  [ReportTypes.GSTR1]: ['factoryId', 'fromDate', 'toDate'],
  [ReportTypes.GSTR3B]: ['factoryId', 'fromDate', 'toDate'],
};

const LABELS = {
  factoryId: 'Factory', partyId: 'Party', fromDate: 'From', toDate: 'To', from: 'From', to: 'To',
  deadStockDays: 'Dead-stock days', accountKey: 'Account', q: 'Search text',
};

export default function SavedReportsPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Report Builder', 'subtab');
  const [reportType, setReportType] = useTabParam(REPORT_TYPES, ReportTypes.STOCK_AGEING, 'report', 'subtab');
  const [params, setParams] = useState({});
  const [reportName, setReportName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: partyData } = useParties({ page: 1, limit: 100 });
  const savedReports = usePaginated(useSavedReports);
  const createReport = useCreateSavedReport();
  const { glassMode } = useUIStore();
  const deleteReport = useDeleteSavedReport();
  /**
   * Saving, deleting and exporting were all rendered unconditionally here,
   * unlike the catalog reports next door, whose toolbar asks the API per report
   * (`report.canExport`). This page runs the older saved-report endpoints,
   * which carry a single REPORT_* grant each, so gate on those.
   *
   * Export stays a separate grant from read on purpose: downloading a whole
   * filtered result set is a different act from reading a page of it on screen.
   */
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(WebPermissions.REPORT_CREATE);
  const canDelete = hasPermission(WebPermissions.REPORT_DELETE);
  const canExport = hasPermission(WebPermissions.REPORT_FINANCE_EXPORT)
    || hasPermission(WebPermissions.REPORT_SALES_EXPORT)
    || hasPermission(WebPermissions.REPORT_PURCHASE_EXPORT)
    || hasPermission(WebPermissions.REPORT_INVENTORY_EXPORT)
    || hasPermission(WebPermissions.REPORT_PRODUCTION_EXPORT);
  const runReport = useRunReport();
  const runSaved = useRunSavedReport();
  const exportReport = useExportReport();
  const search = useDocumentSearch(searchTerm);

  const fields = PARAM_FIELDS[reportType] || [];

  const handleRun = () => {
    setError('');
    setResult(null);
    runReport
      .mutateAsync({ reportType, params })
      .then(setResult)
      .catch((err) => setError(err.response?.data?.message || 'Failed to run report.'));
  };

  const handleSave = () => {
    setError('');
    if (!reportName) {
      setError('Give the report a name before saving it.');
      return;
    }
    createReport
      .mutateAsync({ name: reportName, reportType, params })
      .then(() => setReportName(''))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save report.'));
  };

  const handleRunSaved = (report) => {
    setError('');
    setResult(null);
    setReportType(report.reportType);
    setParams(report.params || {});
    runSaved
      .mutateAsync({ id: report.id, params: {} })
      .then(setResult)
      .catch((err) => setError(err.response?.data?.message || 'Failed to run saved report.'));
  };

  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (reportToDelete) {
      deleteReport.mutate(reportToDelete.id);
      setReportToDelete(null);
    }
  };

  const renderField = (field) => {
    if (field === 'factoryId') {
      return (
        <select
          value={params.factoryId || ''}
          onChange={(e) => setParams({ ...params, factoryId: e.target.value })}
          className={cn("w-full h-9 px-3 rounded-md border text-sm transition-all", glassMode ? "glass-surface border-white/20 text-foreground" : "border-input bg-background")}
        >
          <option value="" className="bg-popover text-popover-foreground">Select factory</option>
          {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id} className="bg-popover text-popover-foreground">{f.name}</option>)}
        </select>
      );
    }
    if (field === 'partyId') {
      return (
        <select
          value={params.partyId || ''}
          onChange={(e) => setParams({ ...params, partyId: e.target.value })}
          className={cn("w-full h-9 px-3 rounded-md border text-sm transition-all", glassMode ? "glass-surface border-white/20 text-foreground" : "border-input bg-background")}
        >
          <option value="" className="bg-popover text-popover-foreground">Select party</option>
          {(partyData?.rows || []).map((p) => <option key={p.id} value={p.id} className="bg-popover text-popover-foreground">{p.name} ({p.partyType})</option>)}
        </select>
      );
    }
    if (field === 'accountKey') {
      return (
        <select
          value={params.accountKey || 'CASH'}
          onChange={(e) => setParams({ ...params, accountKey: e.target.value })}
          className={cn("w-full h-9 px-3 rounded-md border text-sm transition-all", glassMode ? "glass-surface border-white/20 text-foreground" : "border-input bg-background")}
        >
          <option value="CASH" className="bg-popover text-popover-foreground">Cash</option>
          <option value="BANK" className="bg-popover text-popover-foreground">Bank</option>
        </select>
      );
    }
    if (['fromDate', 'toDate', 'from', 'to'].includes(field)) {
      return <Input type="date" value={params[field] || ''} onChange={(e) => setParams({ ...params, [field]: e.target.value })} className={cn(glassMode && "glass-surface text-foreground")} />;
    }
    if (field === 'deadStockDays') {
      return <Input type="number" min="1" value={params.deadStockDays || ''} onChange={(e) => setParams({ ...params, deadStockDays: Number(e.target.value) || undefined })} placeholder="90" className={cn(glassMode && "glass-surface text-foreground")} />;
    }
    return <Input value={params[field] || ''} onChange={(e) => setParams({ ...params, [field]: e.target.value })} className={cn(glassMode && "glass-surface text-foreground")} />;
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageDescription>Ad-hoc analytics, saved parameter sets and cross-module document search (M39/M40)</PageDescription>
        <Link
          to="/reports"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-all shadow-xs",
            glassMode ? "glass-card border-white/20 text-foreground hover:bg-white/20" : "border-input hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeft size={14} /> Back to Reports
        </Link>
      </div>

      {glassMode ? (
        <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex border-b border-border mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer', activeTab === tab ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'Report Builder' && (
        <div className="space-y-8">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

          <div className={cn("space-y-4 p-4 rounded-2xl border shadow-xs", glassMode ? "glass-card border-white/20 dark:border-white/10" : "border-border bg-card")}>
            <div className="space-y-1.5 max-w-sm">
              <Label className={cn(glassMode && "text-foreground/90 font-medium")}>Report Type</Label>
              <select
                value={reportType}
                onChange={(e) => { setReportType(e.target.value); setParams({}); setResult(null); }}
                className={cn(
                  "w-full h-9 px-3 rounded-md border text-sm transition-all",
                  glassMode ? "glass-surface border-white/25 text-foreground" : "border-input bg-background"
                )}
              >
                {Object.values(ReportTypes).map((t) => <option key={t} value={t} className="bg-popover text-popover-foreground">{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {fields.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label>{LABELS[field] || field}</Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              <Button onClick={handleRun} disabled={runReport.isPending}>
                <Play size={16} /> {runReport.isPending ? 'Running...' : 'Run Report'}
              </Button>
              <div className="space-y-1.5">
                <Label className={cn(glassMode && "text-foreground/90 font-medium")}>Save as</Label>
                <Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Report name" className={cn("w-56", glassMode && "glass-surface text-foreground")} />
              </div>
              {canCreate && (
                <Button variant="outline" onClick={handleSave} disabled={createReport.isPending}>
                  <Save size={16} /> Save
                </Button>
              )}
              {/* Value columns are dropped entirely from the file for users
                  without VIEW_RATES — the server decides, not the UI. */}
              {canExport && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => exportReport.mutate({ reportType, params, format: 'csv' })}
                    disabled={exportReport.isPending}
                  >
                    <Download size={16} /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportReport.mutate({ reportType, params, format: 'pdf' })}
                    disabled={exportReport.isPending}
                  >
                    <Download size={16} /> PDF
                  </Button>
                </>
              )}
            </div>
          </div>

          {result && (
            <div className="space-y-2">
              <div className={cn(glassMode && "glass-card px-4 py-2.5 rounded-2xl border border-white/20 dark:border-white/10 shadow-xs inline-block")}>
                <h3 className="text-sm font-bold text-foreground">Result</h3>
              </div>
              <pre className={cn("p-4 rounded-xl border text-xs overflow-auto max-h-[32rem]", glassMode ? "glass-card border-white/20 dark:border-white/10 text-foreground" : "border-border bg-card")}>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <div className="space-y-3">
            <div className={cn("flex items-center justify-between", glassMode && "glass-card px-4 py-2.5 rounded-2xl border border-white/20 dark:border-white/10 shadow-xs")}>
              <h3 className="text-base font-bold text-foreground tracking-tight">Saved Reports</h3>
            </div>
            {savedReports.query.isLoading ? (
              <div className="w-full h-64 rounded-xl border border-border bg-card animate-pulse" />
            ) : (
              <DataTable
                columns={[
                  { accessorKey: 'name', header: 'Name' },
                  { id: 'type', header: 'Type', cell: ({ row }) => row.original.reportType.replace(/_/g, ' ') },
                  {
                    id: 'actions', header: '',
                    cell: ({ row }) => (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleRunSaved(row.original)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Run">
                          <Play size={16} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(row.original)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]}
                {...savedReports.tableProps}
                searchPlaceholder="Search report name…"
              />
            )}
          </div>
          
          <ConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            title="Delete Saved Report"
            description={`Delete report "${reportToDelete?.name}"?`}
            onConfirm={handleConfirmDelete}
            confirmText="Delete"
            variant="destructive"
          />
        </div>
      )}

      {activeTab === 'Document Search' && (
        <div className="space-y-4">
          <div className={cn("space-y-1.5 max-w-md p-4 rounded-2xl border shadow-xs", glassMode ? "glass-card border-white/20 dark:border-white/10" : "border-border bg-card")}>
            <Label className={cn(glassMode && "text-foreground/90 font-medium")}>Search by document number</Label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. INV/0001, GRN, SO/00" className={cn("pl-9", glassMode && "glass-surface text-foreground")} />
            </div>
          </div>
          {searchTerm.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
          ) : search.isLoading ? (
            <div className="w-full h-64 rounded-xl border border-border bg-card animate-pulse" />
          ) : (
            <DataTable
              columns={[
                { id: 'type', header: 'Document Type', cell: ({ row }) => row.original.documentType.replace(/([A-Z])/g, ' $1').trim() },
                { accessorKey: 'number', header: 'Number' },
                { id: 'date', header: 'Date', cell: ({ row }) => <DateText value={row.original.date} /> },
              ]}
              data={search.data || []}
              searchKey="number"
            />
          )}
        </div>
      )}
    </div>
  );
}
