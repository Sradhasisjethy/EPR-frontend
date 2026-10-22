import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyAccountSelect } from '@/components/ledger/money-account-select';
import { toPaise, formatINR } from '@/lib/money';

/**
 * One split payment, as rows of "how much, by what method, into which account".
 *
 * Shared by the counter sale and the receipt form so both screens ask for money
 * the same way and build the same `modes` payload the API already takes
 * (payments.schema modeBody). Each method shows only its own detail fields —
 * a UPI row asks for a transaction reference, a cheque row for the cheque's
 * number, bank and date, and cash for nothing beyond the till it goes into.
 *
 * All arithmetic is in integer paise via toPaise; nothing here does float math
 * on rupees.
 */

export const MODE_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export const emptyPaymentMode = () => ({
  mode: 'CASH',
  amountRupees: '',
  reference: '',
  chequeNumber: '',
  bankName: '',
  chequeDate: '',
  accountId: undefined,
});

/** Sum of the rows, in integer paise; a blank amount counts as zero. */
export const paymentModesTotalPaise = (modes) =>
  (modes || []).reduce((sum, m) => sum + (m.amountRupees === '' ? 0 : toPaise(m.amountRupees)), 0);

/**
 * Why these rows cannot be submitted yet, or null when they can.
 * The server checks all of this again; this only words it for the form.
 */
export const paymentModesError = (modes) => {
  for (const m of modes || []) {
    if (m.amountRupees === '' || !(toPaise(m.amountRupees) > 0)) {
      return 'Every payment row needs an amount above zero.';
    }
    if (m.mode === 'CHEQUE' && !String(m.chequeNumber || '').trim()) {
      return 'A cheque payment needs the cheque number.';
    }
  }
  return null;
};

/** The rows as the API's `modes` array — only the fields each method uses. */
export const paymentModesToPayload = (modes) =>
  (modes || []).map((m) => ({
    mode: m.mode,
    amountPaise: toPaise(m.amountRupees),
    ...(m.accountId ? { accountId: m.accountId } : {}),
    ...((m.mode === 'UPI' || m.mode === 'BANK') && String(m.reference || '').trim()
      ? { reference: String(m.reference).trim() }
      : {}),
    ...(m.mode === 'CHEQUE'
      ? {
          chequeNumber: String(m.chequeNumber || '').trim(),
          ...(String(m.bankName || '').trim() ? { bankName: String(m.bankName).trim() } : {}),
          ...(m.chequeDate ? { chequeDate: m.chequeDate } : {}),
        }
      : {}),
  }));

const DETAIL_PLACEHOLDER = {
  UPI: 'UPI transaction / reference ID',
  BANK: 'UTR / transaction reference',
};

export function PaymentModesEditor({ modes, onChange, duePaise = null, label = 'Payment', addLabel = 'Add payment method' }) {
  const update = (i, patch) => onChange(modes.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const add = () => onChange([...modes, { ...emptyPaymentMode(), mode: 'CASH' }]);
  const remove = (i) => onChange(modes.filter((_, idx) => idx !== i));

  const receivedPaise = paymentModesTotalPaise(modes);
  const remainingPaise = duePaise === null ? null : duePaise - receivedPaise;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus size={14} /> {addLabel}
        </Button>
      </div>

      {modes.map((m, i) => (
        <div key={i} className="rounded-md border border-border/70 p-2 space-y-1.5">
          <div className="flex gap-2 items-center">
            <select
              aria-label={`Payment method ${i + 1}`}
              value={m.mode}
              onChange={(e) => update(i, { mode: e.target.value, accountId: undefined, reference: '', chequeNumber: '', bankName: '', chequeDate: '' })}
              className="h-9 w-[140px] px-2 rounded-md border border-input bg-background text-sm"
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount (₹)"
              aria-label={`Amount (payment ${i + 1})`}
              className="flex-1"
              value={m.amountRupees}
              onChange={(e) => update(i, { amountRupees: e.target.value })}
              required
            />
            <MoneyAccountSelect
              mode={m.mode}
              value={m.accountId}
              onChange={(v) => update(i, { accountId: v })}
              aria-label={`Deposited to (payment ${i + 1})`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={modes.length === 1}
              aria-label={`Remove payment ${i + 1}`}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {(m.mode === 'UPI' || m.mode === 'BANK') && (
            <Input
              aria-label={`Reference (payment ${i + 1})`}
              className="h-8 text-xs"
              placeholder={DETAIL_PLACEHOLDER[m.mode]}
              value={m.reference}
              onChange={(e) => update(i, { reference: e.target.value })}
            />
          )}
          {m.mode === 'CHEQUE' && (
            <div className="grid grid-cols-3 gap-2">
              {/* Deliberately not `required`: the form's own submit handler words
                  the refusal, and the native blocker would silence it. */}
              <Input
                aria-label={`Cheque number (payment ${i + 1})`}
                className="h-8 text-xs"
                placeholder="Cheque number"
                value={m.chequeNumber}
                onChange={(e) => update(i, { chequeNumber: e.target.value })}
              />
              <Input
                aria-label={`Cheque bank (payment ${i + 1})`}
                className="h-8 text-xs"
                placeholder="Bank name"
                value={m.bankName}
                onChange={(e) => update(i, { bankName: e.target.value })}
              />
              <Input
                type="date"
                aria-label={`Cheque date (payment ${i + 1})`}
                className="h-8 text-xs"
                value={m.chequeDate}
                onChange={(e) => update(i, { chequeDate: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}

      {/* Shown once it says something the big total does not: a split in
          progress, a shortfall that will go on credit, or an over-collection.
          A single row matching the bill exactly needs no echo of the figure. */}
      {duePaise !== null && (modes.length > 1 || remainingPaise !== 0) && (
        <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-muted-foreground px-0.5">
          <span>
            Received: <span className="font-medium text-foreground tabular-nums">{formatINR(receivedPaise)}</span>
          </span>
          {remainingPaise > 0 && (
            <span>
              Remaining due:{' '}
              <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">{formatINR(remainingPaise)}</span>
            </span>
          )}
          {remainingPaise < 0 && (
            <span>
              Over by:{' '}
              <span className="font-medium text-destructive tabular-nums">{formatINR(-remainingPaise)}</span>
            </span>
          )}
          {remainingPaise === 0 && <span className="text-primary font-medium">Settled in full</span>}
        </div>
      )}
    </div>
  );
}
