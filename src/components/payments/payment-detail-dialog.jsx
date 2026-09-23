import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { DateText } from '@/components/date-text';
import { formatINR } from '@/lib/money';
import { useReceipt, usePayment } from '@/hooks/use-payments';

/**
 * Read-only detail for a receipt, payment or cheque.
 *
 * Receipts and payments are fetched rather than read from the row: the list
 * carries allocations, but only as `invoiceType` + a bare `invoiceId`. The
 * detail endpoint resolves those to invoice numbers, which is the only thing
 * that makes an allocation list worth showing. Cheques need no fetch — the row
 * already holds the whole lifecycle.
 */

const Field = ({ label, children }) => (
  <div className="space-y-0.5 min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-medium break-words">{children ?? '—'}</div>
  </div>
);

const Rows = ({ children }) => (
  <div className="rounded-lg border border-border divide-y divide-border">{children}</div>
);

export function PaymentDetailDialog({ open, onOpenChange, kind, record }) {
  const isReceipt = kind === 'Receipts';
  const isPayment = kind === 'Payments';

  const receiptQuery = useReceipt(isReceipt && open ? record?.id : undefined);
  const paymentQuery = usePayment(isPayment && open ? record?.id : undefined);

  if (!record) return null;

  // Fall back to the row until the detail lands, so the dialog opens with the
  // figures already on screen rather than an empty frame.
  const detail = (isReceipt ? receiptQuery.data : isPayment ? paymentQuery.data : null) || record;
  const loading = (isReceipt && receiptQuery.isLoading) || (isPayment && paymentQuery.isLoading);

  const titles = {
    Receipts: `Receipt ${record.receiptNumber || ''}`,
    Payments: `Payment ${record.paymentNumber || ''}`,
    Cheques: `Cheque ${record.chequeNumber || ''}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titles[kind] || 'Details'}</DialogTitle>
        </DialogHeader>

        {kind === 'Cheques' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Party">{record.party?.name}</Field>
              <Field label="Direction">{record.direction}</Field>
              <Field label="Status"><StatusBadge status={String(record.status || '').toLowerCase()} /></Field>
              <Field label="Cheque number">{record.chequeNumber}</Field>
              <Field label="Bank">{record.bankName}</Field>
              <Field label="Cheque date"><DateText value={record.chequeDate} /></Field>
              <Field label="Amount">{formatINR(record.amountPaise)}</Field>
              {record.bankChargesPaise > 0 && (
                <Field label="Bank charges">{formatINR(record.bankChargesPaise)}</Field>
              )}
            </div>

            {/* The lifecycle is the reason a cheque needs a detail view — the
                table shows only where it ended up, not when it got there. */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Lifecycle</p>
              <Rows>
                {[
                  ['Presented', record.presentedAt],
                  ['Cleared', record.clearedAt],
                  ['Bounced', record.bouncedAt],
                ]
                  .filter(([, at]) => at)
                  .map(([label, at]) => (
                    <div key={label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{label}</span>
                      <DateText value={at} withTime />
                    </div>
                  ))}
                {!record.presentedAt && !record.clearedAt && !record.bouncedAt && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Not presented yet.</p>
                )}
              </Rows>
              {record.bounceReason && (
                <p className="mt-2 text-sm text-destructive">Bounce reason: {record.bounceReason}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={isReceipt ? 'Customer' : 'Party'}>
                {detail.customer?.name || detail.party?.name}
              </Field>
              <Field label="Date">
                <DateText value={detail.receiptDate || detail.paymentDate} />
              </Field>
              <Field label="Status"><StatusBadge status={String(detail.status || '').toLowerCase()} /></Field>
              <Field label="Total">{formatINR(detail.totalAmountPaise)}</Field>
              <Field label="Unallocated">{formatINR(detail.unallocatedAmountPaise)}</Field>
            </div>

            {/* How the money arrived — cash, bank and cheque can be mixed on one
                receipt, and the table shows only the total. */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Modes</p>
              <Rows>
                {(detail.modes || []).map((mode, i) => (
                  <div key={`${mode.mode}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>{mode.mode}</span>
                    <span className="tabular-nums">{formatINR(mode.amountPaise)}</span>
                  </div>
                ))}
                {!detail.modes?.length && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No modes recorded.</p>
                )}
              </Rows>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Applied to</p>
              <Rows>
                {(detail.allocations || []).map((allocation) => (
                  <div key={allocation.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {allocation.invoiceNumber || `${allocation.invoiceType} invoice`}
                    </span>
                    <span className="tabular-nums shrink-0">{formatINR(allocation.allocatedAmountPaise)}</span>
                  </div>
                ))}
                {!detail.allocations?.length && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {loading ? 'Loading…' : 'Not applied to any invoice — the full amount is on account.'}
                  </p>
                )}
              </Rows>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
