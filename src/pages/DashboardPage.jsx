import { useState } from 'react';
import {
  Factory as FactoryIcon, Truck, ClipboardList, Timer, AlertTriangle,
  TrendingUp, Wallet, Package, PiggyBank, Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/data-table/data-table';
import { formatINR } from '@/lib/money';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { useFactories } from '@/hooks/use-factory';

const Stat = ({ icon: Icon, label, value, hint, tone = 'default' }) => (
  <div className="p-4 rounded-xl border border-border bg-card">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn(
          'text-2xl font-semibold mt-1 tabular-nums',
          tone === 'danger' && 'text-destructive',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400'
        )}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      {Icon && <Icon size={18} className="text-muted-foreground shrink-0" />}
    </div>
  </div>
);

/**
 * A dependency-free sparkline. The bars are proportional to the series max, so
 * an all-zero month renders flat rather than dividing by zero.
 */
const TrendBars = ({ data, valueKey, format }) => {
  const max = Math.max(...data.map((d) => Number(d[valueKey] || 0)), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((point) => {
        const value = Number(point[valueKey] || 0);
        return (
          <div key={point.month} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-colors min-h-[2px]"
              style={{ height: `${(value / max) * 100}%` }}
              title={`${point.month}: ${format ? format(value) : value}`}
            />
            <span className="text-[10px] text-muted-foreground">{point.month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
};

const Skeleton = () => (
  <div className="grid grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
    ))}
  </div>
);

export default function DashboardPage() {
  const [factoryId, setFactoryId] = useState('');
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data, isLoading, isError } = useDashboardStats(factoryId || undefined);

  if (isLoading) return <div className="space-y-6"><h2 className="text-2xl font-bold tracking-tight">Dashboard</h2><Skeleton /></div>;
  if (isError) return <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load the dashboard.</div>;

  const ops = data?.operational || {};
  // The financial block is absent entirely for users without VIEW_RATES
  // (AC-14.1) — this is a presence check, not a permission check.
  const fin = data?.financial;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {fin ? 'Operations and financial position' : 'Operations'} — live for your assigned factories
          </p>
        </div>
        <div className="space-y-1.5 w-56">
          <Label>Factory</Label>
          <select
            value={factoryId}
            onChange={(e) => setFactoryId(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All my factories</option>
            {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* --- Operations: visible to every role --- */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Operations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={FactoryIcon} label="Produced today" value={ops.productionToday ?? 0} hint={`${ops.productionMTD ?? 0} this month`} />
          <Stat icon={Truck} label="Dispatches today" value={ops.dispatchesToday ?? 0} />
          <Stat icon={ClipboardList} label="Pending orders" value={ops.pendingOrders ?? 0} />
          <Stat icon={Timer} label="Lots curing" value={ops.curingLots ?? 0} hint={`${ops.curingCompletingThisWeek?.length ?? 0} complete within 7 days`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={Percent} label="Yield (MTD)" value={`${ops.yieldPercent ?? 0}%`} tone={ops.yieldPercent >= 95 ? 'good' : undefined} />
          <Stat icon={Percent} label="Rejection (MTD)" value={`${ops.rejectionPercent ?? 0}%`} tone={ops.rejectionPercent > 5 ? 'warn' : undefined} />
          <Stat icon={Package} label="Dead stock lots" value={ops.deadStockLots ?? 0} tone={ops.deadStockLots > 0 ? 'danger' : 'good'} hint={`${ops.slowMovingLots ?? 0} slow-moving`} />
          <Stat icon={AlertTriangle} label="Unread alerts" value={ops.unreadAlerts ?? 0} tone={ops.unreadAlerts > 0 ? 'warn' : undefined} hint={`${ops.pendingVarianceApprovals ?? 0} approvals pending`} />
        </div>
      </section>

      {/* --- Finance: this whole section is absent without VIEW_RATES --- */}
      {fin && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Finance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={TrendingUp} label="Sales today" value={formatINR(fin.salesTodayPaise)} hint={`${formatINR(fin.salesMTDPaise)} this month`} />
            <Stat icon={Truck} label="Purchases (MTD)" value={formatINR(fin.purchaseMTDPaise)} />
            <Stat icon={Wallet} label="Cash" value={formatINR(fin.cashBalancePaise)} tone={fin.cashBalancePaise < 0 ? 'danger' : undefined} />
            <Stat icon={PiggyBank} label="Bank" value={formatINR(fin.bankBalancePaise)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Receivables" value={formatINR(fin.receivablesPaise)} hint="Owed to us" />
            <Stat label="Payables" value={formatINR(fin.payablesPaise)} hint="Owed by us" />
            <Stat label="Inventory value" value={formatINR(fin.inventoryValuePaise)} />
            <Stat
              label="Dead stock share"
              value={`${fin.deadStockPercent}%`}
              hint={formatINR(fin.deadStockValuePaise)}
              tone={fin.deadStockPercent > 10 ? 'danger' : fin.deadStockPercent > 5 ? 'warn' : 'good'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <p className="text-sm font-medium">Receivables ageing</p>
              <div className="space-y-2">
                {[
                  ['Not due', fin.receivablesAgeing.notDue, 'bg-emerald-500'],
                  ['1–30 days', fin.receivablesAgeing.d1_30, 'bg-amber-400'],
                  ['31–60 days', fin.receivablesAgeing.d31_60, 'bg-amber-500'],
                  ['61–90 days', fin.receivablesAgeing.d61_90, 'bg-orange-500'],
                  ['90+ days', fin.receivablesAgeing.d90Plus, 'bg-destructive'],
                ].map(([label, value, colour]) => {
                  const pct = fin.receivablesPaise > 0 ? (value / fin.receivablesPaise) * 100 : 0;
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="tabular-nums">{formatINR(value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', colour)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <p className="text-sm font-medium">Cash &amp; bank by factory</p>
              <DataTable
                columns={[
                  { accessorKey: 'factoryName', header: 'Factory' },
                  { id: 'cash', header: 'Cash', cell: ({ row }) => formatINR(row.original.cashPaise) },
                  { id: 'bank', header: 'Bank', cell: ({ row }) => formatINR(row.original.bankPaise) },
                ]}
                data={fin.cashByFactory}
              />
            </div>
          </div>
        </section>
      )}

      {/* --- Trends --- */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Last 12 months</h3>
        <div className={cn('grid gap-4', fin ? 'lg:grid-cols-2' : 'grid-cols-1')}>
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <p className="text-sm font-medium">Production</p>
            <TrendBars data={data.trends} valueKey="production" />
          </div>
          {fin && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <p className="text-sm font-medium">Sales</p>
              <TrendBars data={data.trends} valueKey="salesPaise" format={formatINR} />
            </div>
          )}
        </div>
      </section>

      {/* --- Actionable lists --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Curing completing this week</h3>
          <DataTable
            columns={[
              { accessorKey: 'lotNumber', header: 'Lot #' },
              { accessorKey: 'productName', header: 'Product' },
              { accessorKey: 'quantity', header: 'Qty' },
              { accessorKey: 'originDate', header: 'Produced' },
            ]}
            data={ops.curingCompletingThisWeek || []}
            emptyMessage="Nothing finishing curing in the next 7 days."
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Below reorder level</h3>
          <DataTable
            columns={[
              { accessorKey: 'productName', header: 'Material' },
              { accessorKey: 'onHand', header: 'On hand' },
              { accessorKey: 'reorderLevel', header: 'Reorder at' },
            ]}
            data={ops.reorderAlerts || []}
            emptyMessage="All raw materials are above their reorder level."
          />
        </div>
      </section>
    </div>
  );
}
