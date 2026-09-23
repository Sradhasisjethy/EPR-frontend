import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { DateText } from '@/components/date-text';
import { formatINR } from '@/lib/money';
import { trimDecimals } from '@/lib/decimal';

/**
 * Read-only detail for a workforce record.
 *
 * Renders from the row the table already holds rather than fetching: the list
 * endpoints include exactly what the detail endpoints do — contractor, product
 * and, for a material issue, its lines. So there is no request to make, no
 * spinner, and no chance of the dialog disagreeing with the row behind it.
 *
 * If a list is ever slimmed down for performance, this is the thing that
 * breaks, and the fix is a detail fetch rather than more optional chaining.
 */

const Field = ({ label, children }) => (
  <div className="space-y-0.5 min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-medium break-words">{children ?? '—'}</div>
  </div>
);

export function WorkforceDetailDialog({ open, onOpenChange, kind, record, showRates = false }) {
  if (!record) return null;

  const titles = {
    'Material Issues': `Material Issue ${record.issueNumber || ''}`,
    'Production Entries': `Production Entry ${record.entryNumber || ''}`,
    Attendance: 'Attendance',
    Advances: `Advance ${record.advanceNumber || ''}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titles[kind] || 'Details'}</DialogTitle>
        </DialogHeader>

        {kind === 'Material Issues' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Contractor">{record.contractor?.name}</Field>
              <Field label="Issue date"><DateText value={record.issueDate} /></Field>
              <Field label="Status">
                <StatusBadge status={String(record.status || '').toLowerCase()} />
              </Field>
            </div>

            {/* The lines are the reason this view exists — the table can only
                show how many there are. */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Materials issued</p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {(record.lines || []).map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{line.product?.name || line.productId}</span>
                    <span className="tabular-nums shrink-0">{trimDecimals(line.quantity)}</span>
                  </div>
                ))}
                {!record.lines?.length && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No lines on this issue.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {kind === 'Production Entries' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Contractor">{record.contractor?.name}</Field>
            <Field label="Product">{record.product?.name}</Field>
            <Field label="Production date"><DateText value={record.productionDate} /></Field>
            <Field label="Quantity">{trimDecimals(record.quantity)}</Field>
            <Field label="Curing days">{record.curingDays ?? '—'}</Field>
            <Field label="Status">
              <StatusBadge status={String(record.status || '').toLowerCase()} />
            </Field>
            {/* BR-07: piece rate and value are money, so they follow VIEW_RATES
                exactly as they do in the table behind this dialog. */}
            {showRates && <Field label="Piece rate">{formatINR(record.pieceRatePaise)}</Field>}
            {showRates && <Field label="Total value">{formatINR(record.totalValuePaise)}</Field>}
          </div>
        )}

        {kind === 'Attendance' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Labourer">{record.labour?.name}</Field>
            <Field label="Date"><DateText value={record.attendanceDate} /></Field>
            <Field label="Status">{record.status}</Field>
            <Field label="Overtime hours">{record.overtimeHours ?? '—'}</Field>
            {showRates && <Field label="Wage accrued">{formatINR(record.wageAccruedPaise)}</Field>}
          </div>
        )}

        {kind === 'Advances' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Party">{record.party?.name}</Field>
              <Field label="Date"><DateText value={record.advanceDate} /></Field>
              <Field label="Mode">{record.mode}</Field>
              {showRates && <Field label="Amount">{formatINR(record.amountPaise)}</Field>}
              <Field label="Status">
                <StatusBadge status={String(record.status || '').toLowerCase()} />
              </Field>
            </div>
            {/* The reason is captured on the form and then never shown anywhere
                — the table has no room for free text. */}
            <Field label="Reason">{record.reason || '—'}</Field>
            {record.status === 'CANCELLED' && record.cancelReason && (
              <Field label="Cancellation reason">{record.cancelReason}</Field>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
