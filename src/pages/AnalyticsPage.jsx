import { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useFactories } from '@/hooks/use-factory';
import { useStockAgeing, useDashboardKpis, useCostingReport, useAlerts, useCancellationAnalytics } from '@/hooks/use-analytics';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Dashboard', 'Stock Ageing', 'Costing', 'Alerts', 'Cancellations'];

const StatCard = ({ label, value, hint }) => (
  <div className="p-4 rounded-xl border border-border bg-card">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const Skeleton = () => <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />;

const SEVERITY_STYLES = {
  high: 'bg-destructive/10 border-destructive/20 text-destructive',
  medium: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
  low: 'bg-muted border-border text-muted-foreground',
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Dashboard');
  const [factoryId, setFactoryId] = useState('');
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [deadStockDays, setDeadStockDays] = useState(90);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });

  const dateParams = range.fromDate && range.toDate ? range : {};
  const dashboard = useDashboardKpis(factoryId, dateParams);
  const ageing = useStockAgeing(factoryId, { deadStockDays });
  const costing = useCostingReport(activeTab === 'Costing' ? factoryId : '');
  const alerts = useAlerts(activeTab === 'Alerts' ? factoryId : '');
  const cancellations = useCancellationAnalytics(activeTab === 'Cancellations' ? factoryId : '', dateParams);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Insights</h2>
        <p className="text-muted-foreground">Dashboards, stock ageing, costing, alerts and cancellation analysis (M32-M38)</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        <div className="space-y-1.5">
          <Label>Factory</Label>
          <select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
            <option value="" disabled>Select factory</option>
            {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>From (optional)</Label>
          <Input type="date" value={range.fromDate} onChange={(e) => setRange({ ...range, fromDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>To (optional)</Label>
          <Input type="date" value={range.toDate} onChange={(e) => setRange({ ...range, toDate: e.target.value })} />
        </div>
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

      {!factoryId && <p className="text-sm text-muted-foreground">Select a factory to load analytics.</p>}

      {activeTab === 'Dashboard' && factoryId && (
        dashboard.isLoading ? <Skeleton /> : dashboard.data && (
          <div className="space-y-8">
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Sales Value" value={showRates ? formatINR(dashboard.data.salesValuePaise) : '—'} />
              <StatCard label="Purchase Value" value={showRates ? formatINR(dashboard.data.purchaseValuePaise) : '—'} />
              <StatCard label="Dispatches" value={dashboard.data.dispatchCount} />
              <StatCard label="Production Qty" value={dashboard.data.productionQty} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Cash Balance" value={showRates ? formatINR(dashboard.data.cashBalancePaise) : '—'} />
              <StatCard label="Bank Balance" value={showRates ? formatINR(dashboard.data.bankBalancePaise) : '—'} />
              <StatCard label="Receivables" value={showRates ? formatINR(dashboard.data.outstandingReceivablesPaise) : '—'} hint="Owed to us" />
              <StatCard label="Payables" value={showRates ? formatINR(dashboard.data.outstandingPayablesPaise) : '—'} hint="Owed by us" />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Top Products</h3>
                <DataTable
                  columns={[
                    { accessorKey: 'productName', header: 'Product' },
                    ...(showRates ? [{ id: 'total', header: 'Sales Value', cell: ({ row }) => formatINR(row.original.totalPaise) }] : []),
                  ]}
                  data={dashboard.data.topProducts}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Top Customers</h3>
                <DataTable
                  columns={[
                    { accessorKey: 'customerName', header: 'Customer' },
                    ...(showRates ? [{ id: 'total', header: 'Sales Value', cell: ({ row }) => formatINR(row.original.totalPaise) }] : []),
                  ]}
                  data={dashboard.data.topCustomers}
                />
              </div>
            </div>
          </div>
        )
      )}

      {activeTab === 'Stock Ageing' && factoryId && (
        <div className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Dead-stock threshold (days)</Label>
            <Input type="number" min="1" value={deadStockDays} onChange={(e) => setDeadStockDays(Number(e.target.value) || 90)} />
          </div>
          {ageing.isLoading ? <Skeleton /> : ageing.data && (
            <div className="space-y-8">
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(ageing.data.buckets).map(([bucket, v]) => (
                  <StatCard key={bucket} label={`${bucket} days`} value={`${v.count} lots · ${v.qty} units`} hint={showRates ? formatINR(v.valuePaise) : undefined} />
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Dead Stock (idle ≥ {ageing.data.deadStockDays} days)</h3>
                <DataTable
                  columns={[
                    { accessorKey: 'lotNumber', header: 'Lot #' },
                    { accessorKey: 'productName', header: 'Product' },
                    { accessorKey: 'originDate', header: 'Origin Date' },
                    { accessorKey: 'ageDays', header: 'Age (days)' },
                    { accessorKey: 'qtyAvailable', header: 'Qty' },
                    ...(showRates ? [{ id: 'value', header: 'Value', cell: ({ row }) => formatINR(row.original.valuePaise) }] : []),
                  ]}
                  data={ageing.data.deadStock}
                  searchKey="lotNumber"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">All Available Lots</h3>
                <DataTable
                  columns={[
                    { accessorKey: 'lotNumber', header: 'Lot #' },
                    { accessorKey: 'productName', header: 'Product' },
                    { accessorKey: 'originDate', header: 'Origin Date' },
                    { accessorKey: 'ageDays', header: 'Age (days)' },
                    { accessorKey: 'bucket', header: 'Bucket' },
                    { accessorKey: 'qtyAvailable', header: 'Qty' },
                    ...(showRates ? [{ id: 'value', header: 'Value', cell: ({ row }) => formatINR(row.original.valuePaise) }] : []),
                  ]}
                  data={ageing.data.lots}
                  searchKey="lotNumber"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Costing' && factoryId && (
        costing.isLoading ? <Skeleton /> : costing.data && (
          <DataTable
            columns={[
              { accessorKey: 'productName', header: 'Product' },
              { accessorKey: 'mixDesignName', header: 'Mix Design' },
              ...(showRates
                ? [
                    { id: 'cost', header: 'Standard Cost', cell: ({ row }) => formatINR(row.original.standardCostPaise) },
                    { id: 'rate', header: 'Avg Selling Rate', cell: ({ row }) => (row.original.avgSellingRatePaise === null ? '—' : formatINR(row.original.avgSellingRatePaise)) },
                    { id: 'margin', header: 'Margin', cell: ({ row }) => (row.original.marginPaise === null ? '—' : formatINR(row.original.marginPaise)) },
                    { id: 'marginPct', header: 'Margin %', cell: ({ row }) => (row.original.marginPercent === null ? '—' : `${row.original.marginPercent}%`) },
                    { id: 'contractor', header: 'Avg Contractor Rate', cell: ({ row }) => (row.original.avgContractorPieceRatePaise === null ? '—' : formatINR(row.original.avgContractorPieceRatePaise)) },
                  ]
                : []),
            ]}
            data={costing.data}
            searchKey="productName"
          />
        )
      )}

      {activeTab === 'Alerts' && factoryId && (
        alerts.isLoading ? <Skeleton /> : alerts.data && (
          <div className="space-y-3">
            {alerts.data.length === 0 && (
              <div className="flex items-center gap-2 p-4 rounded-xl border border-border text-sm text-muted-foreground">
                <Info size={16} /> No alerts — nothing needs attention at this factory.
              </div>
            )}
            {alerts.data.map((alert, i) => (
              <div key={`${alert.refId}-${i}`} className={cn('flex items-start gap-3 p-4 rounded-xl border text-sm', SEVERITY_STYLES[alert.severity])}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-medium">{alert.type.replace(/_/g, ' ')}</p>
                  <p>{alert.message}</p>
                  {showRates && alert.outstandingPaise !== undefined && <p className="text-xs">Outstanding: {formatINR(alert.outstandingPaise)}</p>}
                  {showRates && alert.balancePaise !== undefined && <p className="text-xs">Balance: {formatINR(alert.balancePaise)}</p>}
                  <p className="text-xs opacity-70">{new Date(alert.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'Cancellations' && factoryId && (
        cancellations.isLoading ? <Skeleton /> : cancellations.data && (
          <div className="space-y-6">
            <StatCard label="Total Cancelled Documents" value={cancellations.data.totalCancelled} />
            {cancellations.data.byDocumentType.length === 0 && <p className="text-sm text-muted-foreground">No cancellations in this period.</p>}
            {cancellations.data.byDocumentType.map((doc) => (
              <div key={doc.documentType} className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {doc.documentType} — {doc.count} cancelled
                  {showRates && doc.totalValuePaise !== null && ` · ${formatINR(doc.totalValuePaise)}`}
                </h3>
                <DataTable
                  columns={[
                    { accessorKey: 'reason', header: 'Reason' },
                    { accessorKey: 'count', header: 'Count' },
                  ]}
                  data={doc.topReasons}
                />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
