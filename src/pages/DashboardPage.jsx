import { lazy, Suspense, useState } from 'react';
import {
  AlertTriangle, ClipboardList, Factory as FactoryIcon, Package, Percent,
  PiggyBank, Timer, TrendingUp, Truck, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/data-table/data-table';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { DateText } from '@/components/date-text';
import { KpiTile, Panel } from '@/components/dashboard/kpi-tile';
import { formatINR } from '@/lib/money';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { useFactories } from '@/hooks/use-factory';
import { useTabParam } from '@/hooks/use-tab-param';

// recharts is roughly half a megabyte and only this route draws charts, so it
// is split out rather than shipped to every page.
const TrendArea = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.TrendArea })));
const YieldDonut = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.YieldDonut })));
const PipelineBars = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.PipelineBars })));

const ChartFallback = () => <div className="h-[220px] rounded-xl bg-muted/40 animate-pulse" />;

const TABS = ['Production', 'Sales'];

export default function DashboardPage() {
  const [factoryId, setFactoryId] = useState('');
  return <Dashboard factoryId={factoryId} setFactoryId={setFactoryId} />;
}

function Dashboard({ factoryId, setFactoryId }) {
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data, isLoading, isError } = useDashboardStats(factoryId || undefined);
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Production');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardSkeleton />
      </div>
    );
  }
  if (isError) {
    return <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load the dashboard.</div>;
  }

  const ops = data?.operational || {};
  // The financial half is absent entirely for users without VIEW_RATES
  // (AC-14.1) — a presence check here, not a permission check.
  const fin = data?.financial;
  const sales = data?.sales;
  const tabs = fin ? TABS : ['Production'];
  const tab = tabs.includes(activeTab) ? activeTab : 'Production';

  return (
    <div className="space-y-6">
      {/* Tabs and the factory filter share one row. The page title lives in the
          top bar now, so a separate header row here left the select stranded
          on the far right with nothing opposite it. */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border">
        <div className="flex">
          {tabs.map((name) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === name
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Label className="text-xs text-muted-foreground shrink-0">Factory</Label>
          <select
            value={factoryId}
            onChange={(e) => setFactoryId(e.target.value)}
            className="h-9 w-52 px-3 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">All my factories</option>
            {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {tab === 'Production' ? <ProductionTab ops={ops} trends={data.trends} /> : <SalesTab fin={fin} sales={sales} trends={data.trends} />}
    </div>
  );
}

function ProductionTab({ ops, trends }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          accent="rose" icon={FactoryIcon} label="Produced today"
          value={ops.productionToday ?? 0} hint={`${ops.productionMTD ?? 0} this month`}
        />
        <KpiTile
          accent="amber" icon={Percent} label="Yield (MTD)"
          value={`${ops.yieldPercent ?? 0}%`}
          hint={`${ops.rejectionPercent ?? 0}% rejected`}
          hintTone={ops.rejectionPercent > 5 ? 'warn' : undefined}
        />
        <KpiTile
          accent="lime" icon={Truck} label="Dispatches today"
          value={ops.dispatchesToday ?? 0} hint={`${ops.pendingOrders ?? 0} orders open`}
        />
        <KpiTile
          accent="sky" icon={Timer} label="Lots curing"
          value={ops.curingLots ?? 0}
          hint={`${ops.curingCompletingThisWeek?.length ?? 0} complete within 7 days`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Production — last 12 months" className="lg:col-span-2">
          <Suspense fallback={<ChartFallback />}>
            <TrendArea data={trends} valueKey="production" />
          </Suspense>
        </Panel>
        <Panel title="Yield vs rejection (MTD)">
          <Suspense fallback={<ChartFallback />}>
            <YieldDonut yieldPercent={ops.yieldPercent ?? 0} rejectionPercent={ops.rejectionPercent ?? 0} />
          </Suspense>
        </Panel>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          accent="rose" icon={Package} label="Dead stock lots" value={ops.deadStockLots ?? 0}
          tone={ops.deadStockLots > 0 ? 'danger' : 'good'} hint={`${ops.slowMovingLots ?? 0} slow-moving`}
        />
        <KpiTile
          accent="amber" icon={AlertTriangle} label="Unread alerts" value={ops.unreadAlerts ?? 0}
          tone={ops.unreadAlerts > 0 ? 'warn' : undefined}
        />
        <KpiTile accent="violet" icon={ClipboardList} label="Variance approvals" value={ops.pendingVarianceApprovals ?? 0}
          tone={ops.pendingVarianceApprovals > 0 ? 'warn' : undefined} />
        <KpiTile accent="teal" icon={ClipboardList} label="Open orders" value={ops.pendingOrders ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Curing completing this week">
          <DataTable
            columns={[
              { accessorKey: 'lotNumber', header: 'Lot #' },
              { accessorKey: 'productName', header: 'Product' },
              { accessorKey: 'quantity', header: 'Qty' },
              { id: 'originDate', header: 'Produced', cell: ({ row }) => <DateText value={row.original.originDate} /> },
            ]}
            data={ops.curingCompletingThisWeek || []}
            emptyMessage="Nothing finishing curing in the next 7 days."
          />
        </Panel>
        <Panel title="Below reorder level">
          <DataTable
            columns={[
              { accessorKey: 'productName', header: 'Material' },
              { accessorKey: 'onHand', header: 'On hand' },
              { accessorKey: 'reorderLevel', header: 'Reorder at' },
            ]}
            data={ops.reorderAlerts || []}
            emptyMessage="All raw materials are above their reorder level."
          />
        </Panel>
      </div>
    </div>
  );
}

function SalesTab({ fin, sales, trends }) {
  const ageing = fin.receivablesAgeing || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          accent="sky" icon={TrendingUp} label="Net sales today"
          value={formatINR(fin.salesTodayPaise)} hint={`${formatINR(fin.salesMTDPaise)} this month`}
        />
        <KpiTile
          accent="amber" icon={Wallet} label="Receivables"
          value={formatINR(fin.receivablesPaise)}
          hint={`${formatINR(ageing.d90Plus || 0)} over 90 days`}
          hintTone={(ageing.d90Plus || 0) > 0 ? 'danger' : undefined}
        />
        <KpiTile accent="lime" icon={ClipboardList} label="Open orders" value={fin.pendingOrders ?? sales?.pipeline?.reduce((n, p) => n + (['CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_DISPATCHED'].includes(p.status) ? p.count : 0), 0) ?? 0} />
        <KpiTile accent="rose" icon={PiggyBank} label="Payables" value={formatINR(fin.payablesPaise)} hint="Owed by us" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Sales — last 12 months" className="lg:col-span-2">
          <Suspense fallback={<ChartFallback />}>
            <TrendArea data={trends} valueKey="salesPaise" money />
          </Suspense>
        </Panel>
        <Panel title="Order pipeline">
          <Suspense fallback={<ChartFallback />}>
            <PipelineBars data={sales?.pipeline} />
          </Suspense>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Receivables ageing">
          <div className="space-y-2 pt-1">
            {[
              ['Not due', ageing.notDue, 'bg-emerald-500'],
              ['1–30 days', ageing.d1_30, 'bg-amber-400'],
              ['31–60 days', ageing.d31_60, 'bg-amber-500'],
              ['61–90 days', ageing.d61_90, 'bg-orange-500'],
              ['90+ days', ageing.d90Plus, 'bg-destructive'],
            ].map(([label, value, colour]) => {
              const pct = fin.receivablesPaise > 0 ? ((value || 0) / fin.receivablesPaise) * 100 : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums">{formatINR(value || 0)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', colour)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Top customers this month">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Customer' },
              { id: 'invoices', header: 'Invoices', cell: ({ row }) => row.original.invoices },
              { id: 'total', header: 'Invoiced', cell: ({ row }) => formatINR(row.original.totalPaise) },
            ]}
            data={sales?.topCustomers || []}
            emptyMessage="Nothing invoiced this month yet."
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile accent="violet" icon={Truck} label="Purchases (MTD)" value={formatINR(fin.purchaseMTDPaise)} />
        <KpiTile accent="teal" icon={Wallet} label="Cash" value={formatINR(fin.cashBalancePaise)} tone={fin.cashBalancePaise < 0 ? 'danger' : undefined} />
        <KpiTile accent="sky" icon={PiggyBank} label="Bank" value={formatINR(fin.bankBalancePaise)} />
        <KpiTile
          accent="amber" icon={Package} label="Dead stock share" value={`${fin.deadStockPercent}%`}
          hint={formatINR(fin.deadStockValuePaise)}
          tone={fin.deadStockPercent > 10 ? 'danger' : fin.deadStockPercent > 5 ? 'warn' : 'good'}
        />
      </div>
    </div>
  );
}
