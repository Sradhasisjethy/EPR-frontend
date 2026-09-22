import { useState } from 'react';
import { AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/money';
import { formatDate } from '@/lib/date-format';
import { useFactories } from '@/hooks/use-factory';
import { useProfitAndLoss, useBalanceSheet } from '@/hooks/use-ledger';

const SELECT = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm';

function Amount({ paise, strong = false, className }) {
  return (
    <span className={cn('tabular-nums text-right', strong && 'font-semibold', Number(paise) < 0 && 'text-rose-600', className)}>
      {formatINR(paise)}
    </span>
  );
}

function Row({ label, paise, strong = false, indent = false, muted = false }) {
  return (
    <div className={cn('flex justify-between gap-4 py-1', indent && 'pl-4', strong && 'border-t border-border mt-1 pt-2', muted && 'text-muted-foreground')}>
      <span className={cn(strong && 'font-semibold')}>{label}</span>
      <Amount paise={paise} strong={strong} />
    </div>
  );
}

/** One statement group: its accounts indented, then its total. Nothing when empty. */
function Group({ section, showEmpty = false }) {
  if (!section || (!section.accounts.length && !showEmpty)) return null;
  return (
    <div className="py-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-2">{section.label}</div>
      {section.accounts.map((a) => <Row key={`${a.accountId}-${a.name}`} label={a.name} paise={a.amountPaise} indent />)}
      <Row label={`Total ${section.label.toLowerCase()}`} paise={section.totalPaise} muted />
    </div>
  );
}

function Filters({ factoryId, setFactoryId, children }) {
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="space-y-1.5 w-56">
        <Label htmlFor="fs-factory">Factory</Label>
        <select id="fs-factory" className={SELECT} value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
          <option value="">All factories</option>
          {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      {children}
      <Button variant="outline" onClick={() => window.print()} className="ml-auto"><Printer size={16} /> Print</Button>
    </div>
  );
}

function ValuationNote({ valuation }) {
  if (!valuation) return null;
  return (
    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
      {valuation.unvaluedProducts > 0 && <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-px" />}
      <span>
        Stock is valued at each product&apos;s standard cost, counted by the day each movement was recorded.
        {valuation.unvaluedProducts > 0 && ` ${valuation.unvaluedProducts} product(s) in stock have no standard cost and are counted at zero — set one in Products to include them.`}
      </span>
    </p>
  );
}

const StatementShell = ({ title, subtitle, isLoading, isError, error, children }) => {
  if (isLoading) return <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />;
  if (isError) {
    return (
      <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">
        {error?.response?.data?.message || `Failed to load the ${title.toLowerCase()}.`}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 max-w-3xl text-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
};

export function ProfitAndLoss() {
  const [factoryId, setFactoryId] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  // Blank dates mean "the current financial year to date" on the server.
  const params = { ...(factoryId ? { factoryId } : {}), ...(range.from && range.to ? range : {}) };
  const { data: pl, isLoading, isError, error } = useProfitAndLoss(params);

  return (
    <div className="space-y-4">
      <Filters factoryId={factoryId} setFactoryId={setFactoryId}>
        <div className="space-y-1.5">
          <Label htmlFor="pl-from">From</Label>
          <Input id="pl-from" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pl-to">To</Label>
          <Input id="pl-to" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
      </Filters>

      <StatementShell
        title="Profit & Loss"
        subtitle={pl ? `${formatDate(pl.from)} to ${formatDate(pl.to)}` : ''}
        isLoading={isLoading} isError={isError} error={error}
      >
        {pl && (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide pt-1">Trading account</div>
            <Row label="Opening stock" paise={pl.trading.openingStockPaise} indent />
            <Group section={pl.trading.directExpense} />
            <Group section={pl.trading.directIncome} />
            <Row label="Closing stock" paise={pl.trading.closingStockPaise} indent />
            <Row label={pl.trading.grossProfitPaise >= 0 ? 'Gross profit' : 'Gross loss'} paise={pl.trading.grossProfitPaise} strong />

            <div className="text-xs font-semibold uppercase tracking-wide pt-4">Profit & loss account</div>
            <Group section={pl.indirectIncome} />
            <Group section={pl.indirectExpense} />
            <div className={cn('flex justify-between gap-4 mt-3 pt-3 border-t-2 border-foreground/20 text-base font-semibold', pl.netProfitPaise < 0 && 'text-rose-600')}>
              <span>{pl.netProfitPaise >= 0 ? 'Net profit' : 'Net loss'}</span>
              <span className="tabular-nums">{formatINR(pl.netProfitPaise)}</span>
            </div>
            <div className="mt-4"><ValuationNote valuation={pl.stockValuation} /></div>
          </>
        )}
      </StatementShell>
    </div>
  );
}

export function BalanceSheet() {
  const [factoryId, setFactoryId] = useState('');
  const [asOf, setAsOf] = useState('');
  const params = { ...(factoryId ? { factoryId } : {}), ...(asOf ? { asOf } : {}) };
  const { data: bs, isLoading, isError, error } = useBalanceSheet(params);

  return (
    <div className="space-y-4">
      <Filters factoryId={factoryId} setFactoryId={setFactoryId}>
        <div className="space-y-1.5">
          <Label htmlFor="bs-asof">As of</Label>
          <Input id="bs-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
      </Filters>

      <StatementShell
        title="Balance Sheet"
        subtitle={bs ? `As of ${formatDate(bs.asOf)}` : ''}
        isLoading={isLoading} isError={isError} error={error}
      >
        {bs && (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide pt-1">Capital & liabilities</div>
            {bs.capital.map((s) => <Group key={s.group} section={s} />)}
            {bs.liabilities.map((s) => <Group key={s.group} section={s} />)}
            <Row label="Total capital & liabilities" paise={bs.totalLiabilitiesAndCapitalPaise} strong />

            <div className="text-xs font-semibold uppercase tracking-wide pt-5">Assets</div>
            {bs.assets.map((s) => <Group key={s.group} section={s} />)}
            <Row label="Total assets" paise={bs.totalAssetsPaise} strong />

            {bs.differencePaise !== 0 && (
              <div role="alert" className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                The two sides differ by {formatINR(bs.differencePaise)}. Every posting is balanced, so this points at data entered outside the application.
              </div>
            )}
            <div className="mt-4"><ValuationNote valuation={bs.stockValuation} /></div>
          </>
        )}
      </StatementShell>
    </div>
  );
}
