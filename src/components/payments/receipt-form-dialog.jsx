import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateReceipt } from '@/hooks/use-payments';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useSalesInvoices } from '@/hooks/use-invoicing';
import { PartyType } from '@/constants/enums';
import { toPaise, formatINR, fromPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  PaymentModesEditor,
  emptyPaymentMode,
  paymentModesTotalPaise,
  paymentModesError,
  paymentModesToPayload,
} from '@/components/payments/payment-modes-editor';

export function ReceiptFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', customerPartyId: '', receiptDate: '' });
  const [modes, setModes] = useState([emptyPaymentMode()]);
  const [allocations, setAllocations] = useState({}); // invoiceId -> amountRupees
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const { data: invoicesData } = useSalesInvoices({ page: 1, limit: 50, customerPartyId: form.customerPartyId || undefined, status: 'POSTED', openOnly: true });
  const createMutation = useCreateReceipt();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', customerPartyId: '', receiptDate: today() });
      setModes([emptyPaymentMode()]);
      setAllocations({});
      setError('');
    }
  }, [open]);

  useEffect(() => setAllocations({}), [form.customerPartyId]);

  const updateFirstModeAmount = (amountRupees) =>
    setModes((prev) => prev.map((m, idx) => (idx === 0 ? { ...m, amountRupees } : m)));

  // Live reconciliation the server will enforce again: the receipt's total is
  // the sum of its modes, and no more than that may be allocated to invoices.
  const receivedPaise = paymentModesTotalPaise(modes);
  const allocatedPaise = Object.values(allocations).reduce((sum, amountRupees) => sum + toPaise(amountRupees || 0), 0);
  const onAccountPaise = receivedPaise - allocatedPaise;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.customerPartyId) {
      setError('Choose the customer this money came from.');
      return;
    }
    const modesProblem = paymentModesError(modes);
    if (modesProblem) {
      setError(modesProblem);
      return;
    }
    if (allocatedPaise > receivedPaise) {
      setError(`You have allocated ${formatINR(allocatedPaise)} but only received ${formatINR(receivedPaise)}.`);
      return;
    }

    const payload = {
      ...form,
      modes: paymentModesToPayload(modes),
      allocations: Object.entries(allocations)
        .filter(([, amountRupees]) => amountRupees)
        .map(([invoiceId, amountRupees]) => ({ invoiceId, allocatedAmountPaise: toPaise(amountRupees) })),
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Receipt recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to record receipt.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Receipt (money in)</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receipt-customer">Customer</Label>
              {/* Searches every customer rather than the first hundred: with
                  400 on the books, a plain select could not reach most of them. */}
              <SearchableSelect
                id="receipt-customer"
                value={form.customerPartyId}
                onChange={(id) => setForm({ ...form, customerPartyId: id })}
                useOptions={useParties}
                filters={{ partyType: PartyType.CUSTOMER, status: 'active' }}
                getOptionLabel={(party) => party.name}
                getOptionHint={(party) => party.code}
                placeholder="Select customer"
                searchPlaceholder="Search name, code or GSTIN…"
                emptyMessage="No customer matches that."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt Date</Label>
              <Input type="date" value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} required />
            </div>
          </div>

          <PaymentModesEditor modes={modes} onChange={setModes} label="Payment Modes" addLabel="Add Mode" />

          {(receivedPaise > 0 || allocatedPaise > 0) && (
            <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-muted-foreground px-0.5">
              <span>Received: <span className="font-medium text-foreground tabular-nums">{formatINR(receivedPaise)}</span></span>
              <span>Allocated to invoices: <span className="font-medium text-foreground tabular-nums">{formatINR(allocatedPaise)}</span></span>
              {onAccountPaise > 0 && (
                <span>On account (unallocated): <span className="font-medium text-foreground tabular-nums">{formatINR(onAccountPaise)}</span></span>
              )}
              {onAccountPaise < 0 && (
                <span className="text-destructive font-medium">Allocated {formatINR(-onAccountPaise)} more than received</span>
              )}
            </div>
          )}

          {form.customerPartyId && (invoicesData?.rows || []).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Allocate against invoices (optional, BR-19/BR-20)</Label>
                <span className="text-xs text-muted-foreground">Select amount to apply to each invoice</span>
              </div>
              <div className="space-y-2 border border-border/60 rounded-lg p-3 bg-muted/20">
                {invoicesData.rows.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{inv.invoiceNumber} — {inv.invoiceDate}</span>
                      <span className="text-xs text-muted-foreground">
                        Outstanding: <span className="font-semibold text-primary">{formatINR(inv.outstandingPaise ?? inv.totalPaise)}</span>
                        {inv.allocatedPaise > 0 && (
                          <span className="ml-2 text-muted-foreground">
                            ({formatINR(inv.allocatedPaise)} of {formatINR(inv.totalPaise)} already received)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number" step="0.01" min="0" placeholder="Allocate (₹)"
                        className="w-32 h-8 text-sm"
                        value={allocations[inv.id] ?? ''}
                        onChange={(e) => setAllocations({ ...allocations, [inv.id]: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-medium"
                        onClick={() => {
                          const amt = fromPaise(inv.outstandingPaise ?? inv.totalPaise);
                          setAllocations((prev) => ({ ...prev, [inv.id]: amt }));
                          if (!modes[0]?.amountRupees) {
                            updateFirstModeAmount(amt);
                          }
                        }}
                      >
                        Full
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Record Receipt'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
