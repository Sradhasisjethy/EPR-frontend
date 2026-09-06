import { useState } from 'react';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAttachRate } from '@/hooks/use-bundles';
import { useFactories } from '@/hooks/use-factory';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { today } from '@/lib/date-format';

/**
 * Attach rate: how often an accessory actually goes out with the product it
 * belongs to, and when it does not, why.
 *
 * This is what the whole removal-reason apparatus is for. "The kit is not
 * selling" is an opinion. "It was offered on 210 orders, went out on 60, and 90
 * of the removals said the site already had stock" is something a business can
 * act on — and the three groupings answer three different questions: is the
 * bundle wrong, is one desk quietly dropping it, or is it a regional objection?
 */

const firstOfYear = () => `${today().slice(0, 4)}-01-01`;

const GROUPINGS = [
  { key: 'product', label: 'By accessory', hint: 'Is the bundle itself wrong?' },
  { key: 'salesperson', label: 'By salesperson', hint: 'Is one desk quietly dropping it?' },
  { key: 'location', label: 'By location', hint: 'Is it a regional objection?' },
];

/** Green above 75%, amber above 40%, red below — a glance, not a science. */
const rateTone = (percent) => {
  if (percent >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

export default function AttachRatePage() {
  const { data: user } = useCurrentUser();
  const [groupBy, setGroupBy] = useState('product');
  const [fromDate, setFromDate] = useState(firstOfYear());
  const [toDate, setToDate] = useState(today());
  const [factoryId, setFactoryId] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data, isLoading, isError, error } = useAttachRate({
    groupBy,
    fromDate,
    toDate,
    ...(factoryId ? { factoryId } : {}),
  });

  if (!hasPermission(user, WebPermissions.ANALYTICS_READ)) {
    return (
      <div className="p-12 text-center rounded-2xl border border-border bg-card/40">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold">Access Restricted</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Reading the attach rate needs the analytics permission.
        </p>
      </div>
    );
  }

  const rows = data?.rows || [];
  const totals = data?.totals;
  const overall = totals?.offered ? Math.round((totals.attached / totals.offered) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          How often an accessory goes out with the product it belongs to, and the reasons given when
          it does not. Removals only count when a reason was recorded, which is why the reason list
          is kept short.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="attach-group-by">Group by</Label>
          <select
            id="attach-group-by"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            {GROUPINGS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="attach-from">From</Label>
          <Input id="attach-from" type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="attach-to">To</Label>
          <Input id="attach-to" type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="attach-plant">Plant</Label>
          <select
            id="attach-plant"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={factoryId}
            onChange={(e) => setFactoryId(e.target.value)}
          >
            <option value="">All plants</option>
            {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <p className="text-[11px] text-muted-foreground pb-2">
          {GROUPINGS.find((g) => g.key === groupBy)?.hint}
        </p>
      </div>

      {isLoading ? (
        <div className="w-full h-64 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive text-sm">
          {error?.response?.data?.message || 'Could not load the attach rate.'}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border bg-card/40">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold">Nothing to report yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            No orders in this range carried a bundle. The figures appear once orders are raised for a
            product that has one.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Offered', totals.offered],
              ['Went out', totals.attached],
              ['Removed', totals.removed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold tabular-nums">{value}</p>
              </div>
            ))}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Attach rate</p>
              <p className={`text-xl font-bold tabular-nums ${rateTone(overall)}`}>{overall}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="h-9 px-3 font-medium">{groupBy === 'product' ? 'Accessory' : groupBy === 'location' ? 'Plant' : 'Salesperson'}</th>
                    <th className="h-9 px-3 font-medium text-right">Offered</th>
                    <th className="h-9 px-3 font-medium text-right">Went out</th>
                    <th className="h-9 px-3 font-medium text-right">Removed</th>
                    <th className="h-9 px-3 font-medium text-right">Attach rate</th>
                    <th className="h-9 px-3 font-medium">Reasons given</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium">
                        {row.label || <span className="font-mono text-[11px] text-muted-foreground">{row.key}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.offered}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.attached}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.removed}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${rateTone(row.attachRatePercent)}`}>
                        {row.attachRatePercent}%
                      </td>
                      <td className="px-3 py-2">
                        {row.reasons.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.reasons.map((r) => (
                              <span key={r.code} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                                {r.label} <span className="font-bold">{r.count}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
