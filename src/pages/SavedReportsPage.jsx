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
import { ReportTypes } from '@/constants/enums';
import { useTabParam } from '@/hooks/use-tab-param';

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
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Report Builder');
  const [reportType, setReportType] = useTabParam(REPORT_TYPES, ReportTypes.STOCK_AGEING, 'report');
  const [params, setParams] = useState({});
  const [reportName, setReportName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: partyData } = useParties({ page: 1, limit: 100 });
  const savedReports = usePaginated(useSavedReports);
  const createReport = useCreateSavedReport();
  const deleteReport = useDeleteSavedReport();
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

  const renderField = (field) => {
    if (field === 'factoryId') {
      return (
        <select value={params.factoryId || ''} onChange={(e) => setParams({ ...params, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
          <option value="">Select factory</option>
          {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      );
    }
    if (field === 'partyId') {
      return (
        <select value={params.partyId || ''} onChange={(e) => setParams({ ...params, partyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
          <option value="">Select party</option>
          {(partyData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partyType})</option>)}
        </select>
      );
    }
    if (field === 'accountKey') {
      return (
        <select value={params.accountKey || 'CASH'} onChange={(e) => setParams({ ...params, accountKey: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
        </select>
      );
    }
    if (['fromDate', 'toDate', 'from', 'to'].includes(field)) {
      return <Input type="date" value={params[field] || ''} onChange={(e) => setParams({ ...params, [field]: e.target.value })} />;
    }
    if (field === 'deadStockDays') {
      return <Input type="number" min="1" value={params.deadStockDays || ''} onChange={(e) => setParams({ ...params, deadStockDays: Number(e.target.value) || undefined })} placeholder="90" />;
    }
    return <Input value={params[field] || ''} onChange={(e) => setParams({ ...params, [field]: e.target.value })} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Saved Report Builder</h2>
          <p className="text-muted-foreground">Ad-hoc analytics, saved parameter sets and cross-module document search (M39/M40)</p>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back to Reports
        </Link>
      </div>

      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Report Builder' && (
        <div className="space-y-8">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

          <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
            <div className="space-y-1.5 max-w-sm">
              <Label>Report Type</Label>
              <select
                value={reportType}
                onChange={(e) => { setReportType(e.target.value); setParams({}); setResult(null); }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Object.values(ReportTypes).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {fields.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
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
                <Label>Save as</Label>
                <Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Report name" className="w-56" />
              </div>
              <Button variant="outline" onClick={handleSave} disabled={createReport.isPending}>
                <Save size={16} /> Save
              </Button>
              {/* Value columns are dropped entirely from the file for users
                  without VIEW_RATES — the server decides, not the UI. */}
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
            </div>
          </div>

          {result && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Result</h3>
              <pre className="p-4 rounded-xl border border-border bg-card text-xs overflow-auto max-h-[32rem]">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Saved Reports</h3>
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
                        <button
                          onClick={() => { if (window.confirm(`Delete report "${row.original.name}"?`)) deleteReport.mutate(row.original.id); }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ),
                  },
                ]}
                {...savedReports.tableProps}
                searchPlaceholder="Search report name…"
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'Document Search' && (
        <div className="space-y-4">
          <div className="space-y-1.5 max-w-md">
            <Label>Search by document number</Label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. INV/0001, GRN, SO/00" className="pl-9" />
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
                { accessorKey: 'date', header: 'Date' },
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
