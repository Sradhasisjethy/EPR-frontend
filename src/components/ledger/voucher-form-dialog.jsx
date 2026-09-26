import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAccounts, useCreateVoucher } from '@/hooks/use-ledger';
import { useFactories } from '@/hooks/use-factory';
import { formatINR, toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const SELECT = 'w-full min-w-0 h-9 px-3 rounded-md border border-input bg-background text-sm';

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), accountId: '', debit: '', credit: '' });

const TYPE_LABEL = { ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Capital', INCOME: 'Income', EXPENSE: 'Expenses' };

/**
 * JOURNAL: any number of debit/credit lines that must balance.
 * CONTRA: money moving between two cash/bank accounts — shown as "from → to"
 * because that is how people think about a deposit or a withdrawal, and it
 * makes an unbalanced contra impossible to enter.
 */
export function VoucherFormDialog({ open, onOpenChange, voucherType = 'JOURNAL' }) {
  const contra = voucherType === 'CONTRA';
  const [factoryId, setFactoryId] = useState('');
  const [voucherDate, setVoucherDate] = useState(today());
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [transfer, setTransfer] = useState({ fromId: '', toId: '', rupees: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const { data: accounts = [] } = useAccounts({}, { enabled: open });
  const create = useCreateVoucher();

  const factories = factoryData?.rows || [];

  useEffect(() => {
    if (!open) return;
    setVoucherDate(today());
    setNarration('');
    setLines([emptyLine(), emptyLine()]);
    setTransfer({ fromId: '', toId: '', rupees: '' });
    setError('');
  }, [open]);

  // With one factory there is nothing to choose. Keyed on the list arriving,
  // not on opening — the list is fetched and is usually not there yet.
  useEffect(() => {
    if (open && !factoryId && factories.length === 1) setFactoryId(factories[0].id);
  }, [open, factoryId, factories]);

  // Receivable/payable are refused by the server (use receipts, payments and
  // notes); leaving them out of the picker saves the round trip.
  const usable = useMemo(() => accounts.filter((a) => !a.isPartyControlAccount), [accounts]);
  const moneyAccounts = useMemo(() => usable.filter((a) => a.subType), [usable]);
  const groupedByType = useMemo(
    () => Object.keys(TYPE_LABEL).map((type) => ({ type, accounts: usable.filter((a) => a.type === type) })).filter((g) => g.accounts.length),
    [usable]
  );

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + toPaise(l.debit), 0);
    const credit = lines.reduce((s, l) => s + toPaise(l.credit), 0);
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  const setLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const payloadLines = () => {
    if (contra) {
      const amount = toPaise(transfer.rupees);
      return [
        { accountId: transfer.toId, debitPaise: amount, creditPaise: 0 },
        { accountId: transfer.fromId, debitPaise: 0, creditPaise: amount },
      ];
    }
    return lines
      .filter((l) => l.accountId && (toPaise(l.debit) > 0 || toPaise(l.credit) > 0))
      .map((l) => ({ accountId: l.accountId, debitPaise: toPaise(l.debit), creditPaise: toPaise(l.credit) }));
  };

  // In the order the form reads, top to bottom, so the hint always points at
  // the first thing still missing.
  const blockedReason = (() => {
    if (!factoryId) return 'Select a factory.';
    if (contra) {
      if (!transfer.fromId || !transfer.toId) return 'Choose both accounts.';
      if (transfer.fromId === transfer.toId) return 'From and to must be different accounts.';
      if (toPaise(transfer.rupees) <= 0) return 'Enter the amount moved.';
    } else {
      const filled = payloadLines();
      if (filled.length < 2) return 'Enter at least two lines.';
      if (filled.some((l) => l.debitPaise > 0 && l.creditPaise > 0)) return 'Each line takes a debit or a credit, not both.';
      if (totals.difference !== 0) return `Debits and credits differ by ${formatINR(Math.abs(totals.difference))}.`;
    }
    if (!narration.trim()) return 'Add a narration — what this entry is for.';
    return null;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blockedReason) return;
    setError('');
    try {
      const voucher = await create.mutateAsync({ factoryId, voucherType, voucherDate, narration: narration.trim(), lines: payloadLines() });
      toast.success(`${voucher.voucherNumber} posted`);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post the voucher.');
    }
  };

  const accountSelect = (id, value, onChange, options, placeholder) => (
    <select id={id} className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options}
    </select>
  );

  const moneyOptions = moneyAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.subType === 'CASH' ? ' (cash)' : ''}</option>);
  const allOptions = groupedByType.map(({ type, accounts: accs }) => (
    <optgroup key={type} label={TYPE_LABEL[type]}>
      {accs.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
    </optgroup>
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contra ? 'max-w-lg' : 'max-w-3xl'}>
        <DialogHeader>
          <DialogTitle>{contra ? 'Contra — move money between cash and bank' : 'Journal Voucher'}</DialogTitle>
          <DialogDescription>
            {contra
              ? 'A deposit, a withdrawal or a transfer between two of your accounts.'
              : 'For entries no other screen makes: loans, capital, rent, provisions, the GST set-off. Customer and vendor balances go through receipts, payments and credit/debit notes.'}
          </DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jv-factory">Factory</Label>
              <select id="jv-factory" className={SELECT} value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
                <option value="">Select factory</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jv-date">Date</Label>
              <Input id="jv-date" type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} required />
            </div>
          </div>

          {contra ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="cv-from">From</Label>
                {accountSelect('cv-from', transfer.fromId, (v) => setTransfer((t) => ({ ...t, fromId: v })), moneyOptions, 'Money leaves…')}
              </div>
              <ArrowRight className="mb-2 text-muted-foreground" size={18} aria-hidden />
              <div className="space-y-1.5">
                <Label htmlFor="cv-to">To</Label>
                {accountSelect('cv-to', transfer.toId, (v) => setTransfer((t) => ({ ...t, toId: v })), moneyOptions, 'Money arrives in…')}
              </div>
              <div className="space-y-1.5 col-span-3">
                <Label htmlFor="cv-amount">Amount (₹)</Label>
                <Input id="cv-amount" type="number" step="0.01" min="0" value={transfer.rupees} onChange={(e) => setTransfer((t) => ({ ...t, rupees: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-[minmax(0,1fr)_130px_130px_36px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30 rounded-t-lg">
                <span>Account</span><span className="text-right">Debit (₹)</span><span className="text-right">Credit (₹)</span><span />
              </div>
              {lines.map((line, index) => (
                <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_130px_130px_36px] gap-2 px-3 py-1.5 items-center">
                  {accountSelect(`jv-account-${index}`, line.accountId, (v) => setLine(line.key, { accountId: v }), allOptions, 'Select account')}
                  <Input
                    aria-label={`Debit line ${index + 1}`} type="number" step="0.01" min="0" className="text-right"
                    value={line.debit} onChange={(e) => setLine(line.key, { debit: e.target.value, ...(e.target.value ? { credit: '' } : {}) })}
                  />
                  <Input
                    aria-label={`Credit line ${index + 1}`} type="number" step="0.01" min="0" className="text-right"
                    value={line.credit} onChange={(e) => setLine(line.key, { credit: e.target.value, ...(e.target.value ? { debit: '' } : {}) })}
                  />
                  <button
                    type="button" aria-label={`Remove line ${index + 1}`} disabled={lines.length <= 2}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive disabled:opacity-30"
                    onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(0,1fr)_130px_130px_36px] gap-2 px-3 py-2 border-t border-border text-sm items-center">
                <button type="button" className="inline-flex items-center gap-1 text-primary text-sm hover:underline justify-self-start" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                  <Plus size={14} /> Add line
                </button>
                <span className="text-right font-medium tabular-nums">{formatINR(totals.debit)}</span>
                <span className="text-right font-medium tabular-nums">{formatINR(totals.credit)}</span>
                <span />
              </div>
              <div className={cn('px-3 pb-2 text-xs text-right', totals.difference === 0 ? 'text-emerald-600' : 'text-amber-600')}>
                {totals.difference === 0 ? (totals.debit > 0 ? 'Balanced' : '') : `Difference ${formatINR(Math.abs(totals.difference))}`}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="jv-narration">Narration</Label>
            <Input id="jv-narration" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={contra ? 'e.g. Cash deposited from counter' : 'e.g. Loan received from director'} />
          </div>

          <DialogFooter className="items-center">
            {blockedReason && <p className="text-xs text-muted-foreground mr-auto">{blockedReason}</p>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!!blockedReason || create.isPending}>{create.isPending ? 'Posting…' : 'Post voucher'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
