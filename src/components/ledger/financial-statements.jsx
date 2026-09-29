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
  const isNeg = Number(paise) < 0;
  return (
    <span
      className={cn(
        'tabular-nums text-right font-mono',
        strong && 'font-bold print:font-extrabold',
        isNeg ? 'text-rose-600 print:text-red-700' : 'text-foreground print:text-slate-950',
        className
      )}
    >
      {formatINR(paise)}
    </span>
  );
}

function Row({ label, paise, strong = false, indent = false, muted = false, doubleBottom = false }) {
  return (
    <div
      className={cn(
        'flex justify-between gap-4 py-1.5 transition-colors',
        indent && 'pl-4 print:pl-5',
        strong && 'border-t border-border mt-1 pt-2 font-semibold print:border-slate-400 print:text-slate-950',
        doubleBottom && 'border-b-4 border-double border-slate-900 pb-1.5',
        muted && 'text-muted-foreground print:text-slate-600 text-xs'
      )}
    >
      <span className={cn(strong && 'font-semibold print:font-bold')}>{label}</span>
      <Amount paise={paise} strong={strong} />
    </div>
  );
}

/** One statement group: its accounts indented, then its total. Nothing when empty. */
function Group({ section, showEmpty = false }) {
  if (!section || (!section.accounts.length && !showEmpty)) return null;
  return (
    <div className="py-1.5 break-inside-avoid">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground print:text-slate-700 pt-2 pb-0.5 border-b border-border/40 print:border-slate-300">
        {section.label}
      </div>
      {section.accounts.map((a) => (
        <Row key={`${a.accountId}-${a.name}`} label={a.name} paise={a.amountPaise} indent />
      ))}
      <Row label={`Total ${section.label.toLowerCase()}`} paise={section.totalPaise} muted strong />
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
          {(factoryData?.rows || []).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      {children}
      <Button variant="outline" onClick={() => window.print()} className="ml-auto flex items-center gap-1.5">
        <Printer size={16} /> Print Statement
      </Button>
    </div>
  );
}

function ValuationNote({ valuation }) {
  if (!valuation) return null;
  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border/50 print:bg-slate-50 print:border-slate-300 print:p-2 break-inside-avoid">
      <p className="text-xs text-muted-foreground print:text-slate-600 flex items-start gap-1.5">
        {valuation.unvaluedProducts > 0 && <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-px print:hidden" />}
        <span>
          <strong>Audit Footnote:</strong> Stock is valued at each product&apos;s standard cost, counted by the day each movement was recorded.
          {valuation.unvaluedProducts > 0 &&
            ` ${valuation.unvaluedProducts} product(s) in stock have no standard cost and are counted at zero — set one in Products to include them.`}
        </span>
      </p>
    </div>
  );
}

const StatementShell = ({ title, subtitle, factoryName, isLoading, isError, error, children }) => {
  if (isLoading) return <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />;
  if (isError) {
    return (
      <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">
        {error?.response?.data?.message || `Failed to load the ${title.toLowerCase()}.`}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-3xl text-sm financial-statement-card print:border-none print:p-0 print:max-w-none print:w-full print:bg-transparent">
      {/* On-screen Header */}
      <div className="mb-4 print:hidden">
        <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {/* Official Statutory Print Header (Appears only on paper / Print to PDF) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
              INFIDEEP ERP - MANUFACTURING
            </h1>
            <p className="text-xs text-slate-700 font-medium mt-0.5">
              Operating Facility: <span className="font-semibold text-slate-900">{factoryName || 'All Operating Plants & Facilities'}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-400 rounded text-[10px] font-bold text-slate-800 uppercase tracking-wider">
              Statutory Accounting Statement
            </span>
            <p className="text-[10px] text-slate-600 mt-1">Printed: {formatDate(new Date())}</p>
          </div>
        </div>

        <div className="mt-3 text-center border-t border-slate-300 pt-2">
          <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wider">
            {title === 'Profit & Loss' ? 'Statement of Profit and Loss' : title}
          </h2>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">{subtitle}</p>
          <p className="text-[10px] text-slate-500 italic mt-0.5">(All monetary figures expressed in Indian Rupees - INR)</p>
        </div>
      </div>

      {/* Statement Content */}
      <div className="space-y-2">{children}</div>

      {/* Official Accounting Signatures Block (Appears only on paper / Print to PDF) */}
      <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-slate-300 text-xs text-slate-800 break-inside-avoid">
        <div className="text-center">
          <div className="border-b border-slate-400 pb-10 mb-1"></div>
          <p className="font-bold text-slate-950">Prepared By</p>
          <p className="text-[10px] text-slate-500">Accounts Department</p>
        </div>
        <div className="text-center">
          <div className="border-b border-slate-400 pb-10 mb-1"></div>
          <p className="font-bold text-slate-950">Checked & Verified</p>
          <p className="text-[10px] text-slate-500">Finance Controller</p>
        </div>
        <div className="text-center">
          <div className="border-b border-slate-400 pb-10 mb-1"></div>
          <p className="font-bold text-slate-950">Authorised Signatory</p>
          <p className="text-[10px] text-slate-500">Managing Director / Partner</p>
        </div>
      </div>
    </div>
  );
};

export function ProfitAndLoss() {
  const [factoryId, setFactoryId] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  // Blank dates mean "the current financial year to date" on the server.
  const params = { ...(factoryId ? { factoryId } : {}), ...(range.from && range.to ? range : {}) };
  const { data: pl, isLoading, isError, error } = useProfitAndLoss(params);

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const selectedFactory = factoryData?.rows?.find((f) => f.id === factoryId);
  const factoryName = selectedFactory?.name || (factoryId ? '' : 'All Factories');

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
        subtitle={pl ? `Period: ${formatDate(pl.from)} to ${formatDate(pl.to)}` : ''}
        factoryName={factoryName}
        isLoading={isLoading}
        isError={isError}
        error={error}
      >
        {pl && (
          <>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-slate-800 pt-2 pb-1 border-b border-border print:border-slate-900">
              I. Trading Account
            </div>
            <Row label="Opening stock" paise={pl.trading.openingStockPaise} indent />
            <Group section={pl.trading.directExpense} />
            <Group section={pl.trading.directIncome} />
            <Row label="Closing stock" paise={pl.trading.closingStockPaise} indent />
            <Row
              label={pl.trading.grossProfitPaise >= 0 ? 'Gross profit' : 'Gross loss'}
              paise={pl.trading.grossProfitPaise}
              strong
              doubleBottom
            />

            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-slate-800 pt-5 pb-1 border-b border-border print:border-slate-900">
              II. Profit & Loss Account
            </div>
            <Group section={pl.indirectIncome} />
            <Group section={pl.indirectExpense} />
            <div
              className={cn(
                'flex justify-between gap-4 mt-3 pt-3 border-t-2 border-foreground/30 text-base font-bold print:border-t-2 print:border-b-4 print:border-double print:border-slate-950 print:py-2.5 print:mt-4',
                pl.netProfitPaise < 0 ? 'text-rose-600 print:text-red-700' : 'text-foreground print:text-slate-950'
              )}
            >
              <span>{pl.netProfitPaise >= 0 ? 'Net Profit transferred to Capital' : 'Net Loss transferred to Capital'}</span>
              <span className="tabular-nums font-mono">{formatINR(pl.netProfitPaise)}</span>
            </div>
            <div className="mt-5">
              <ValuationNote valuation={pl.stockValuation} />
            </div>
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

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const selectedFactory = factoryData?.rows?.find((f) => f.id === factoryId);
  const factoryName = selectedFactory?.name || (factoryId ? '' : 'All Factories');

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
        subtitle={bs ? `Statement as of ${formatDate(bs.asOf)}` : ''}
        factoryName={factoryName}
        isLoading={isLoading}
        isError={isError}
        error={error}
      >
        {bs && (
          <>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-slate-800 pt-2 pb-1 border-b border-border print:border-slate-900">
              I. Capital & Liabilities
            </div>
            {bs.capital.map((s) => (
              <Group key={s.group} section={s} />
            ))}
            {bs.liabilities.map((s) => (
              <Group key={s.group} section={s} />
            ))}
            <Row
              label="Total Capital & Liabilities"
              paise={bs.totalLiabilitiesAndCapitalPaise}
              strong
              doubleBottom
            />

            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-slate-800 pt-6 pb-1 border-b border-border print:border-slate-900">
              II. Assets
            </div>
            {bs.assets.map((s) => (
              <Group key={s.group} section={s} />
            ))}
            <Row label="Total Assets" paise={bs.totalAssetsPaise} strong doubleBottom />

            {bs.differencePaise !== 0 && (
              <div role="alert" className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs print:border print:border-red-500">
                The two sides differ by {formatINR(bs.differencePaise)}. Every posting is balanced, so this points at data entered outside the application.
              </div>
            )}
            <div className="mt-5">
              <ValuationNote valuation={bs.stockValuation} />
            </div>
          </>
        )}
      </StatementShell>
    </div>
  );
}
