import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, BarChart3, Boxes,
  CheckCircle2, ChevronRight, ClipboardList, Factory as FactoryIcon, FileText,
  Layers, Package, Percent, PiggyBank,
  Receipt, ShoppingCart, Timer, TrendingUp, Truck, Wallet,
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
import { useUIStore } from '@/store/ui-store';

// recharts is roughly half a megabyte and only this route draws charts, so it
// is split out rather than shipped to every page.
const TrendArea = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.TrendArea })));
const YieldDonut = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.YieldDonut })));
const PipelineBars = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.PipelineBars })));
const SalesVsPurchasesChart = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.SalesVsPurchasesChart })));
const TopProductsBarChart = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.TopProductsBarChart })));
const TopCustomersBarChart = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.TopCustomersBarChart })));
const StockAgeingDonut = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.StockAgeingDonut })));
const ReceivablesAgeingBarChart = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.ReceivablesAgeingBarChart })));
const LiquidityOverviewChart = lazy(() => import('@/components/dashboard/charts').then((m) => ({ default: m.LiquidityOverviewChart })));

const ChartFallback = () => <div className="h-[240px] rounded-xl bg-muted/40 animate-pulse" />;

const TABS = ['Production', 'Sales', 'Reports'];

export default function DashboardPage() {
  const [factoryId, setFactoryId] = useState('');
  return <Dashboard factoryId={factoryId} setFactoryId={setFactoryId} />;
}

function Dashboard({ factoryId, setFactoryId }) {
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data, isLoading, isError } = useDashboardStats(factoryId || undefined);
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Production');
  const { glassMode } = useUIStore();

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
  const tabs = fin ? ['Production', 'Sales', 'Reports'] : ['Production', 'Reports'];
  const tab = tabs.includes(activeTab) ? activeTab : 'Production';

  return (
    <div className="space-y-6">
      {glassMode ? (
        /* Glassmorphic Bar (When Glassmorphism is ON) */
        <div className="glass-card flex items-center justify-between gap-4 flex-wrap p-2 rounded-2xl shadow-xs">
          <div className="flex items-center p-1 rounded-xl bg-muted/70 border border-border/40 gap-1">
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTab(name)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer',
                  tab === name
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
                )}
              >
                {name === 'Production' && <FactoryIcon size={16} />}
                {name === 'Sales' && <TrendingUp size={16} />}
                {name === 'Reports' && <BarChart3 size={16} />}
                {name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/40">
            <Label className="text-xs font-medium text-foreground/80 shrink-0">Factory</Label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className="h-8 w-52 px-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All my factories</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      ) : (
        /* Standard Clean Tab Bar (When Glassmorphism is OFF) */
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border">
          <div className="flex">
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTab(name)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer',
                  tab === name
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {name === 'Production' && <FactoryIcon size={15} />}
                {name === 'Sales' && <TrendingUp size={15} />}
                {name === 'Reports' && <BarChart3 size={15} />}
                {name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Label className="text-xs text-muted-foreground shrink-0">Factory</Label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className="h-9 w-52 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All my factories</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {tab === 'Production' && <ProductionTab ops={ops} trends={data.trends} />}
      {tab === 'Sales' && <SalesTab fin={fin} sales={sales} trends={data.trends} />}
      {tab === 'Reports' && <ReportsTab fin={fin} sales={sales} ops={ops} trends={data.trends} />}
    </div>
  );
}

function ProductionTab({ ops, trends }) {
  const has = (key) => ops[key] !== undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {has('productionToday') && (
          <KpiTile
            accent="rose" icon={FactoryIcon} label="Produced today"
            value={ops.productionToday} hint={`${ops.productionMTD ?? 0} this month`}
          />
        )}
        {has('yieldPercent') && (
          <KpiTile
            accent="amber" icon={Percent} label="Yield (MTD)"
            value={`${ops.yieldPercent}%`}
            hint={`${ops.rejectionPercent ?? 0}% rejected`}
            hintTone={ops.rejectionPercent > 5 ? 'warn' : undefined}
          />
        )}
        {has('dispatchesToday') && (
          <KpiTile
            accent="lime" icon={Truck} label="Dispatches today"
            value={ops.dispatchesToday} hint={has('pendingOrders') ? `${ops.pendingOrders} orders open` : undefined}
          />
        )}
        {has('curingLots') && (
          <KpiTile
            accent="sky" icon={Timer} label="Lots curing"
            value={ops.curingLots}
            hint={`${ops.curingCompletingThisWeek?.length ?? 0} complete within 7 days`}
          />
        )}
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
        {has('deadStockLots') && (
          <KpiTile
            accent="rose" icon={Package} label="Dead stock lots" value={ops.deadStockLots}
            tone={ops.deadStockLots > 0 ? 'danger' : 'good'} hint={`${ops.slowMovingLots ?? 0} slow-moving`}
          />
        )}
        <KpiTile
          accent="amber" icon={AlertTriangle} label="Unread alerts" value={ops.unreadAlerts ?? 0}
          tone={ops.unreadAlerts > 0 ? 'warn' : undefined}
        />
        {has('pendingVarianceApprovals') && (
          <KpiTile accent="violet" icon={ClipboardList} label="Variance approvals" value={ops.pendingVarianceApprovals}
            tone={ops.pendingVarianceApprovals > 0 ? 'warn' : undefined} />
        )}
        {has('pendingOrders') && (
          <KpiTile accent="teal" icon={ClipboardList} label="Open orders" value={ops.pendingOrders} />
        )}
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
        <Panel
          title="Receivables ageing"
          action={
            <Link to="/reports/finance/party-ageing" className="text-xs text-primary hover:underline flex items-center gap-1">
              Full ageing <ArrowUpRight size={13} />
            </Link>
          }
        >
          <Suspense fallback={<ChartFallback />}>
            <ReceivablesAgeingBarChart ageing={ageing} total={fin.receivablesPaise} height={200} />
          </Suspense>
        </Panel>

        <Panel
          title="Top products this month"
          action={
            <Link to="/reports/sales/sales-register" className="text-xs text-primary hover:underline flex items-center gap-1">
              Sales register <ArrowUpRight size={13} />
            </Link>
          }
        >
          <Suspense fallback={<ChartFallback />}>
            <TopProductsBarChart data={sales?.topProducts} height={200} />
          </Suspense>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top customers this month">
          <Suspense fallback={<ChartFallback />}>
            <TopCustomersBarChart data={sales?.topCustomers} height={200} />
          </Suspense>
        </Panel>

        <Panel title="Customer invoices list">
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

/**
 * The Reports Graphical Charts Suite.
 * Visual analytics across sales, purchasing, inventory, liquidity, and production.
 */
const REPORT_CATEGORIES = ['All', 'Sales', 'Purchases', 'Inventory', 'Finance', 'Production'];

function ReportsTab({ fin, sales, ops, trends }) {
  const ageing = fin?.receivablesAgeing || {};
  const stockValuation = fin?.stockAgeing;
  const stockLots = ops?.stockAgeingLots;
  const [filter, setFilter] = useTabParam(REPORT_CATEGORIES, 'All', 'filter');
  const { glassMode } = useUIStore();

  return (
    <div className="space-y-6">
      {/* Header bar with category filter pills */}
      <div className={cn(
        'flex items-center justify-between gap-3 p-3.5 rounded-2xl flex-wrap',
        glassMode ? 'glass-card shadow-xs' : 'bg-card border border-border shadow-xs'
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Graphical Business Reports</h2>
            <p className="text-xs text-muted-foreground">Interactive analytics across business modules</p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              id={`filter-pill-${cat.toLowerCase()}`}
              data-filter={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer',
                filter === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SALES REPORTS: Visible under 'All' or 'Sales' */}
      {(filter === 'All' || filter === 'Sales') && (
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-xs text-xs font-semibold text-foreground tracking-wider uppercase">
              <TrendingUp size={14} className="text-primary" /> Sales & Revenue Reports
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fin && (
              <Panel
                title="Sales Revenue Trend (12-Mo)"
                action={
                  <Link to="/reports/sales/sales-register" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Sales Report <ArrowUpRight size={13} />
                  </Link>
                }
              >
                <Suspense fallback={<ChartFallback />}>
                  <TrendArea data={trends} valueKey="salesPaise" money height={240} />
                </Suspense>
              </Panel>
            )}

            <Panel
              title="Order Book & Fulfillment Pipeline"
              action={
                <Link to="/reports/orders/order-status" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Order Status <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <PipelineBars data={sales?.pipeline} height={240} />
              </Suspense>
            </Panel>
          </div>

          {fin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel
                title="Top 5 Products by Revenue (MTD)"
                action={
                  <Link to="/reports/sales/sales-register" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Product Analysis <ArrowUpRight size={13} />
                  </Link>
                }
              >
                <Suspense fallback={<ChartFallback />}>
                  <TopProductsBarChart data={sales?.topProducts} height={240} />
                </Suspense>
              </Panel>

              <Panel
                title="Top 5 Customers by Invoiced Revenue (MTD)"
                action={
                  <Link to="/reports/parties/party-ledger" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Party Ledgers <ArrowUpRight size={13} />
                  </Link>
                }
              >
                <Suspense fallback={<ChartFallback />}>
                  <TopCustomersBarChart data={sales?.topCustomers} height={240} />
                </Suspense>
              </Panel>
            </div>
          )}
        </div>
      )}

      {/* PURCHASES REPORTS: Visible under 'All' or 'Purchases' */}
      {(filter === 'All' || filter === 'Purchases') && fin && (
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-xs text-xs font-semibold text-foreground tracking-wider uppercase">
              <Truck size={14} className="text-amber-500" /> Purchases & Procurement Reports
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="Monthly Sales vs Purchases (12-Mo Comparison)"
              className="lg:col-span-2"
              action={
                <Link to="/reports/purchase/purchase-register" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Purchase Register <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <SalesVsPurchasesChart data={trends} height={260} />
              </Suspense>
            </Panel>

            <Panel
              title="Top 5 Vendors by Procurement (MTD)"
              action={
                <Link to="/reports/parties/party-ledger" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Vendor Ledger <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <TopCustomersBarChart
                  data={fin?.topVendors}
                  color="hsl(38, 92%, 50%)"
                  emptyText="No vendor invoices this month."
                  height={260}
                />
              </Suspense>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Procurement Expense History (12-Mo)"
              action={
                <Link to="/reports/purchase/purchase-register" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Purchase Details <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <TrendArea data={trends} valueKey="purchasePaise" colour="hsl(38, 92%, 50%)" money height={240} />
              </Suspense>
            </Panel>

            <Panel title="Purchasing & Payables Summary">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <p className="text-xs text-muted-foreground">Purchases This Month</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">{formatINR(fin?.purchaseMTDPaise)}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <p className="text-xs text-muted-foreground">Accounts Payable (Owed)</p>
                  <p className="text-xl font-bold tabular-nums text-destructive">{formatINR(fin?.payablesPaise)}</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* FINANCE & LIQUIDITY REPORTS: Visible under 'All' or 'Finance' */}
      {(filter === 'All' || filter === 'Finance') && fin && (
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-xs text-xs font-semibold text-foreground tracking-wider uppercase">
              <Wallet size={14} className="text-sky-500" /> Finance & Working Capital Reports
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Working Capital & Liquidity Overview"
              action={
                <Link to="/reports/finance/cash-book" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Cash Book <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <LiquidityOverviewChart
                  cash={fin.cashBalancePaise}
                  bank={fin.bankBalancePaise}
                  receivables={fin.receivablesPaise}
                  payables={fin.payablesPaise}
                  height={240}
                />
              </Suspense>
            </Panel>

            <Panel
              title="Receivables Ageing & Overdue Risk"
              action={
                <Link to="/reports/finance/party-ageing" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Debtor Ageing <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <ReceivablesAgeingBarChart ageing={ageing} total={fin.receivablesPaise} height={240} />
              </Suspense>
            </Panel>
          </div>
        </div>
      )}

      {/* INVENTORY REPORTS: Visible under 'All' or 'Inventory' */}
      {(filter === 'All' || filter === 'Inventory') && (
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-xs text-xs font-semibold text-foreground tracking-wider uppercase">
              <Boxes size={14} className="text-emerald-500" /> Inventory & Stock Reports
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title={fin ? 'Stock Valuation & Ageing Distribution' : 'Stock Ageing Breakdown (Active Lots)'}
              action={
                <Link to="/reports/inventory/stock-ageing" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Stock Ageing Report <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <StockAgeingDonut
                  ageing={fin ? stockValuation : stockLots}
                  mode={fin ? 'value' : 'lots'}
                  height={240}
                />
              </Suspense>
            </Panel>

            <Panel title="Inventory Status Breakdown">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <p className="text-xs text-muted-foreground">Total Inventory Value</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">{fin ? formatINR(fin.inventoryValuePaise) : `${ops.deadStockLots ?? 0} lots`}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <p className="text-xs text-muted-foreground">Dead Stock Valuation</p>
                  <p className="text-xl font-bold tabular-nums text-destructive">{fin ? formatINR(fin.deadStockValuePaise) : `${ops.deadStockLots ?? 0} dead`}</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* PRODUCTION REPORTS: Visible under 'All' or 'Production' */}
      {(filter === 'All' || filter === 'Production') && (
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-xs text-xs font-semibold text-foreground tracking-wider uppercase">
              <FactoryIcon size={14} className="text-violet-500" /> Production & Quality Reports
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Production Volume History (12-Mo)"
              action={
                <Link to="/reports/production/production-summary" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Production Report <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <TrendArea data={trends} valueKey="production" height={240} />
              </Suspense>
            </Panel>

            <Panel
              title="Batch Quality & Yield Analysis (MTD)"
              action={
                <Link to="/reports/production/production-summary" className="text-xs text-primary hover:underline flex items-center gap-1">
                  QC Summary <ArrowUpRight size={13} />
                </Link>
              }
            >
              <Suspense fallback={<ChartFallback />}>
                <YieldDonut yieldPercent={ops.yieldPercent ?? 0} rejectionPercent={ops.rejectionPercent ?? 0} height={240} />
              </Suspense>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
