import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatINR } from '@/lib/money';

/**
 * Every chart on the dashboard, in one module.
 *
 * Kept together and loaded lazily by DashboardPage: recharts is around half a
 * megabyte, and the bundle was already over the size warning before it arrived.
 * Nothing outside the dashboard imports from here, so nothing else pays for it.
 *
 * Colours come from CSS variables rather than literals so the charts follow the
 * light/dark theme like the rest of the app — recharts renders SVG attributes,
 * which do not inherit Tailwind classes.
 */

const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const GRID = 'hsl(var(--border))';

/** Recharts renders a bare box on an empty series; say so in words instead. */
const Empty = ({ children }) => (
  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">{children}</div>
);

const TooltipBox = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground tabular-nums">
          {format ? format(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

/** Monthly series — production quantity or invoiced value. */
export function TrendArea({ data, valueKey, colour = 'hsl(var(--primary))', money = false }) {
  if (!data?.length) return <Empty>No history yet.</Empty>;
  const id = `fill-${valueKey}`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colour} stopOpacity={0.45} />
            <stop offset="100%" stopColor={colour} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }}
          tickFormatter={(m) => String(m).slice(5)} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={money ? 64 : 40}
          tickFormatter={(v) => (money ? formatINR(v).replace('₹', '') : v)} />
        <Tooltip content={<TooltipBox format={money ? formatINR : undefined} />} />
        <Area type="monotone" dataKey={valueKey} stroke={colour} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Yield against rejection for the month. A donut rather than two numbers
 * because the split is the point — 95% good only means something beside the 5%.
 */
export function YieldDonut({ yieldPercent = 0, rejectionPercent = 0 }) {
  const data = [
    { name: 'Accepted', value: yieldPercent, colour: 'hsl(var(--primary))' },
    { name: 'Rejected', value: rejectionPercent, colour: 'hsl(var(--destructive))' },
  ];
  if (yieldPercent === 0 && rejectionPercent === 0) return <Empty>No production this month.</Empty>;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={68} outerRadius={92} paddingAngle={2} stroke="none">
            {data.map((slice) => <Cell key={slice.name} fill={slice.colour} />)}
          </Pie>
          <Tooltip content={<TooltipBox format={(v) => `${v}%`} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold tabular-nums">{yieldPercent}%</span>
        <span className="text-xs text-muted-foreground">accepted</span>
      </div>
    </div>
  );
}

/** Where the order book is sitting, by status. */
export function PipelineBars({ data }) {
  if (!data?.length) return <Empty>No sales orders yet.</Empty>;
  const pretty = data.map((d) => ({
    ...d,
    label: d.status.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={pretty} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
