import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatINR } from '@/lib/money';

/**
 * Every chart on the dashboard, in one module.
 *
 * Kept together and loaded lazily by DashboardPage: recharts is around half a
 * megabyte, and the bundle was already over the size warning before it arrived.
 * Nothing outside the dashboard imports from here, so nothing else pays for it.
 *
 * Colours come from CSS variables and curated HSL palettes so the charts follow
 * the light/dark theme like the rest of the app.
 */

const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const GRID = 'hsl(var(--border))';

/** Compact INR format for chart axis labels (e.g. ₹1.5L, ₹25k). */
const formatAxisINR = (paise) => {
  const rupees = Math.round(Number(paise || 0) / 100);
  if (Math.abs(rupees) >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (Math.abs(rupees) >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (Math.abs(rupees) >= 1000) return `₹${(rupees / 1000).toFixed(0)}k`;
  return `₹${rupees}`;
};

/** Truncate long strings for axis labels. */
const truncate = (str, max = 16) => {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
};

/** Recharts renders a bare box on an empty series; say so in words instead. */
const Empty = ({ children }) => (
  <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">{children}</div>
);

const TooltipBox = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2 justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
            {entry.name || entry.dataKey}:
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {format ? format(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Monthly series — production quantity or invoiced value. */
export function TrendArea({ data, valueKey, colour = 'hsl(var(--primary))', money = false, height = 240 }) {
  if (!data?.length) return <Empty>No history yet.</Empty>;
  const id = `fill-${valueKey}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colour} stopOpacity={0.45} />
            <stop offset="100%" stopColor={colour} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} opacity={0.4} />
        <XAxis
          dataKey="month"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          tickFormatter={(m) => String(m).slice(5)}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={money ? 60 : 40}
          tickFormatter={(v) => (money ? formatAxisINR(v) : v)}
        />
        <Tooltip content={<TooltipBox format={money ? formatINR : undefined} />} />
        <Area type="monotone" dataKey={valueKey} name={money ? 'Sales Revenue' : 'Production Qty'} stroke={colour} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Yield against rejection for the month. A donut rather than two numbers
 * because the split is the point — 95% good only means something beside the 5%.
 */
export function YieldDonut({ yieldPercent = 0, rejectionPercent = 0, height = 240 }) {
  const data = [
    { name: 'Accepted', value: yieldPercent, colour: 'hsl(var(--primary))' },
    { name: 'Rejected', value: rejectionPercent, colour: 'hsl(var(--destructive))' },
  ];
  if (yieldPercent === 0 && rejectionPercent === 0) return <Empty>No production this month.</Empty>;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={68} outerRadius={92} paddingAngle={3} stroke="none">
            {data.map((slice) => <Cell key={slice.name} fill={slice.colour} />)}
          </Pie>
          <Tooltip content={<TooltipBox format={(v) => `${v}%`} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold tabular-nums text-foreground">{yieldPercent}%</span>
        <span className="text-xs text-muted-foreground">accepted</span>
      </div>
    </div>
  );
}

/** Where the order book is sitting, by status. */
export function PipelineBars({ data, height = 240 }) {
  if (!data?.length) return <Empty>No sales orders yet.</Empty>;
  const pretty = data.map((d) => ({
    ...d,
    label: d.status.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={pretty} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} opacity={0.4} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
        <Bar dataKey="count" name="Orders" maxBarSize={36} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Report Chart: Monthly Sales vs Purchases Comparison.
 * Compares Revenue against Procurement costs over the last 12 months.
 */
export function SalesVsPurchasesChart({ data, height = 260 }) {
  if (!data?.length) return <Empty>No sales or purchase history yet.</Empty>;

  const hasPurchases = data.some((d) => (d.purchasePaise || 0) > 0);
  const formattedData = data.map((d) => ({
    month: d.month,
    sales: d.salesPaise || 0,
    purchases: d.purchasePaise || 0,
    margin: (d.salesPaise || 0) - (d.purchasePaise || 0),
  }));

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const sales = payload.find((p) => p.dataKey === 'sales')?.value || 0;
    const purchases = payload.find((p) => p.dataKey === 'purchases')?.value || 0;
    const diff = sales - purchases;

    return (
      <div className="rounded-lg border border-border bg-popover px-3.5 py-2.5 text-xs shadow-md space-y-1.5 min-w-44">
        <p className="font-semibold text-foreground border-b border-border/60 pb-1">{label}</p>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sales:
          </span>
          <span className="font-medium tabular-nums">{formatINR(sales)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Purchases:
          </span>
          <span className="font-medium tabular-nums">{formatINR(purchases)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border/40 font-medium">
          <span className="text-muted-foreground">Net Margin:</span>
          <span className={diff >= 0 ? 'text-emerald-600 dark:text-emerald-400 tabular-nums' : 'text-destructive tabular-nums'}>
            {diff >= 0 ? `+${formatINR(diff)}` : `-${formatINR(Math.abs(diff))}`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={formattedData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} opacity={0.4} />
          <XAxis
            dataKey="month"
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={(m) => String(m).slice(5)}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={formatAxisINR}
          />
          <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
          <Bar dataKey="sales" name="Sales Revenue" maxBarSize={32} fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
          {hasPurchases && (
            <Bar dataKey="purchases" name="Purchases" maxBarSize={32} fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          <span>Sales Revenue</span>
        </div>
        {hasPurchases && (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span>Purchases</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Report Chart: Top Products by Revenue.
 * Horizontal bar chart showcasing product sales performance.
 */
export function TopProductsBarChart({ data, height = 240 }) {
  if (!data?.length) return <Empty>No product sales data this month.</Empty>;

  const chartData = [...data].reverse().map((p) => ({
    name: p.name || p.productName || 'Product',
    fullName: p.name || p.productName || 'Product',
    totalPaise: p.totalPaise || 0,
    totalQty: p.totalQty || 0,
  }));

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
        <p className="font-semibold text-foreground">{item.fullName}</p>
        <p className="text-muted-foreground flex justify-between gap-4">
          <span>Revenue:</span>
          <span className="font-medium text-foreground tabular-nums">{formatINR(item.totalPaise)}</span>
        </p>
        {item.totalQty > 0 && (
          <p className="text-muted-foreground flex justify-between gap-4">
            <span>Units Sold:</span>
            <span className="font-medium text-foreground tabular-nums">
              {item.totalQty}
            </span>
          </p>
        )}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} opacity={0.4} />
        <XAxis
          type="number"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisINR}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={120}
          tickFormatter={(v) => truncate(v, 16)}
        />
        <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
        <Bar dataKey="totalPaise" maxBarSize={28} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Report Chart: Top Customers by Invoiced Revenue.
 */
export function TopCustomersBarChart({
  data,
  height = 240,
  emptyText = 'No customer invoices this month.',
  color = 'hsl(217, 91%, 60%)',
}) {
  if (!data?.length) return <Empty>{emptyText}</Empty>;

  const chartData = [...data].reverse().map((c) => ({
    name: c.name || c.customerName || 'Party',
    fullName: c.name || c.customerName || 'Party',
    totalPaise: c.totalPaise || 0,
    invoices: c.invoices || 0,
  }));

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
        <p className="font-semibold text-foreground">{item.fullName}</p>
        <p className="text-muted-foreground flex justify-between gap-4">
          <span>Amount:</span>
          <span className="font-medium text-foreground tabular-nums">{formatINR(item.totalPaise)}</span>
        </p>
        {item.invoices > 0 && (
          <p className="text-muted-foreground flex justify-between gap-4">
            <span>Invoices:</span>
            <span className="font-medium text-foreground tabular-nums">{item.invoices}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} opacity={0.4} />
        <XAxis
          type="number"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisINR}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={120}
          tickFormatter={(v) => truncate(v, 16)}
        />
        <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
        <Bar dataKey="totalPaise" maxBarSize={28} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Report Chart: Inventory Stock Ageing & Valuation Donut.
 * Displays Fresh vs Slow Moving vs Dead Stock.
 */
export function StockAgeingDonut({ ageing, mode = 'value', height = 240 }) {
  const isMoney = mode === 'value';

  let fresh = 0;
  let slow = 0;
  let dead = 0;
  let total = 0;

  if (isMoney && ageing) {
    fresh = ageing.freshPaise || 0;
    slow = ageing.slowMovingPaise || 0;
    dead = ageing.deadStockPaise || 0;
    total = ageing.totalPaise || (fresh + slow + dead);
  } else if (ageing) {
    fresh = ageing.freshLots || 0;
    slow = ageing.slowMovingLots || 0;
    dead = ageing.deadStockLots || 0;
    total = ageing.totalLots || (fresh + slow + dead);
  }

  if (total <= 0) {
    return <Empty>No inventory available to analyse.</Empty>;
  }

  const slices = [
    { name: 'Fresh Stock (<30d)', value: fresh, colour: 'hsl(142, 71%, 45%)' },
    { name: 'Slow-Moving (30-90d)', value: slow, colour: 'hsl(38, 92%, 50%)' },
    { name: 'Dead Stock (>90d)', value: dead, colour: 'hsl(0, 84%, 60%)' },
  ].filter((s) => s.value > 0);

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
        <p className="font-semibold text-foreground">{item.name}</p>
        <p className="text-muted-foreground flex justify-between gap-4">
          <span>{isMoney ? 'Valuation:' : 'Lots:'}</span>
          <span className="font-medium text-foreground tabular-nums">
            {isMoney ? formatINR(item.value) : item.value} ({pct}%)
          </span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={3}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.colour} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {isMoney ? formatAxisINR(total) : total}
          </span>
          <span className="text-xs text-muted-foreground">{isMoney ? 'total inventory' : 'active lots'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-center border-t border-border/50 pt-2">
        <div>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
          <span className="text-muted-foreground block text-[10px]">Fresh</span>
          <span className="font-medium tabular-nums">{total > 0 ? `${((fresh / total) * 100).toFixed(0)}%` : '0%'}</span>
        </div>
        <div>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1" />
          <span className="text-muted-foreground block text-[10px]">Slow</span>
          <span className="font-medium tabular-nums">{total > 0 ? `${((slow / total) * 100).toFixed(0)}%` : '0%'}</span>
        </div>
        <div>
          <span className="inline-block h-2 w-2 rounded-full bg-destructive mr-1" />
          <span className="text-muted-foreground block text-[10px]">Dead</span>
          <span className="font-medium tabular-nums text-destructive">{total > 0 ? `${((dead / total) * 100).toFixed(0)}%` : '0%'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Report Chart: Receivables Ageing & Overdue Risk.
 * Visual breakdown of debtor balances by age bucket.
 */
export function ReceivablesAgeingBarChart({ ageing = {}, total = 0, height = 240 }) {
  const buckets = [
    { label: 'Not Due', key: 'notDue', value: ageing.notDue || 0, colour: 'hsl(142, 71%, 45%)' },
    { label: '1–30d', key: 'd1_30', value: ageing.d1_30 || 0, colour: 'hsl(84, 81%, 44%)' },
    { label: '31–60d', key: 'd31_60', value: ageing.d31_60 || 0, colour: 'hsl(38, 92%, 50%)' },
    { label: '61–90d', key: 'd61_90', value: ageing.d61_90 || 0, colour: 'hsl(24, 94%, 50%)' },
    { label: '90+ days', key: 'd90Plus', value: ageing.d90Plus || 0, colour: 'hsl(0, 84%, 60%)' },
  ];

  const totalReceivables = total || buckets.reduce((s, b) => s + b.value, 0);

  if (totalReceivables <= 0) {
    return <Empty>No outstanding receivables.</Empty>;
  }

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const pct = totalReceivables > 0 ? ((item.value / totalReceivables) * 100).toFixed(1) : 0;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
        <p className="font-semibold text-foreground">{item.label}</p>
        <p className="text-muted-foreground flex justify-between gap-4">
          <span>Amount:</span>
          <span className="font-medium text-foreground tabular-nums">{formatINR(item.value)}</span>
        </p>
        <p className="text-muted-foreground flex justify-between gap-4">
          <span>Share:</span>
          <span className="font-medium text-foreground tabular-nums">{pct}%</span>
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={buckets} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} opacity={0.4} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={formatAxisINR}
        />
        <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
        <Bar dataKey="value" name="Amount" maxBarSize={36} radius={[6, 6, 0, 0]}>
          {buckets.map((b) => (
            <Cell key={b.key} fill={b.colour} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Report Chart: Working Capital & Liquidity Overview.
 * Compares Cash, Bank, Receivables (Inflows) and Payables (Outflows).
 */
export function LiquidityOverviewChart({ cash = 0, bank = 0, receivables = 0, payables = 0, height = 240 }) {
  const items = [
    { name: 'Cash', value: Math.max(0, cash), raw: cash, colour: 'hsl(160, 84%, 39%)', type: 'Asset' },
    { name: 'Bank', value: Math.max(0, bank), raw: bank, colour: 'hsl(199, 89%, 48%)', type: 'Asset' },
    { name: 'Receivables', value: Math.max(0, receivables), raw: receivables, colour: 'hsl(217, 91%, 60%)', type: 'Asset' },
    { name: 'Payables', value: Math.max(0, payables), raw: payables, colour: 'hsl(0, 84%, 60%)', type: 'Liability' },
  ];

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.colour }} />
          <span>{item.name}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">({item.type})</span>
        </div>
        <p className="text-muted-foreground flex justify-between gap-4">
          <span>Balance:</span>
          <span className="font-medium text-foreground tabular-nums">{formatINR(item.raw)}</span>
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} opacity={0.4} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={formatAxisINR}
        />
        <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
        <Bar dataKey="value" maxBarSize={48} radius={[6, 6, 0, 0]}>
          {items.map((i) => (
            <Cell key={i.name} fill={i.colour} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
