import { useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { useCreateSalesReturn } from '@/hooks/use-returns';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useProducts } from '@/hooks/use-products';
import { PartyType, ProductType } from '@/constants/enums';
import { formatINR, toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SELECT = 'w-full min-w-0 h-9 px-3 rounded-md border border-input bg-background text-sm';
const ROW = 'grid grid-cols-[minmax(0,1fr)_80px_110px_90px_110px] gap-2';

/** What this customer bought at this factory, and how much of it can still come back. */
function useReturnableItems({ factoryId, customerPartyId }) {
  return useQuery({
    queryKey: ['returns', 'returnable', factoryId, customerPartyId],
    queryFn: async () => (await apiClient.get('/returns/returnable', { params: { factoryId, customerPartyId } })).data.data,
    enabled: !!factoryId && !!customerPartyId,
  });
}

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), productId: '', quantity: '', rateRupees: '' });

/**
 * A return is recorded against the invoice the goods went out on: the screen
 * lists what the customer actually bought, shows how much of each line is still
 * returnable, and takes the rate from that invoice rather than from memory.
 *
 * Typing items by hand is still possible — goods sold before go-live have no
 * invoice here — but it is the exception, and a return that mixes the two is
 * sent without an invoice reference, because the server can only check
 * quantities against an invoice it was given.
 */
export function SalesReturnFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', customerPartyId: '', returnDate: '', reason: '' });
  const [invoiceId, setInvoiceId] = useState('');
  const [picked, setPicked] = useState({});        // salesInvoiceLineId -> typed quantity
  const [manualLines, setManualLines] = useState([]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const { data: productData } = useProducts({ page: 1, limit: 100, productType: ProductType.FINISHED_GOOD }, { enabled: open });
  const createMutation = useCreateSalesReturn();

  const returnable = useReturnableItems({ factoryId: form.factoryId, customerPartyId: form.customerPartyId });
  const invoices = returnable.data?.invoices || [];
  const unlinked = returnable.data?.unlinkedReturns || [];

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', customerPartyId: '', returnDate: today(), reason: '' });
      setInvoiceId('');
      setPicked({});
      setManualLines([]);
      setError('');
    }
  }, [open]);

  // Changing who, or where, invalidates anything already picked.
  useEffect(() => {
    setInvoiceId('');
    setPicked({});
  }, [form.factoryId, form.customerPartyId]);

  // With one invoice still open for return there is nothing to choose.
  useEffect(() => {
    if (invoiceId) return;
    const stillOpen = invoices.filter((i) => !i.fullyReturned);
    if (stillOpen.length === 1) setInvoiceId(stillOpen[0].invoiceId);
  }, [invoices, invoiceId]);

  const invoice = invoices.find((i) => i.invoiceId === invoiceId) || null;

  const pickedLines = useMemo(
    () => (invoice?.lines || [])
      .map((line) => ({ line, qty: Number(picked[line.salesInvoiceLineId] || 0) }))
      .filter(({ qty }) => qty > 0),
    [invoice, picked]
  );

  const filledManual = manualLines.filter((l) => l.productId && Number(l.quantity) > 0 && l.rateRupees !== '');

  // The goods went out with GST on them, so they come back with it: the
  // customer is credited the tax-inclusive amount (s.34 CGST Act). An
  // off-invoice line has no rate to go on, so it is shown as taxable only and
  // the server works out its tax from the product's HSN.
  const taxablePaise =
    pickedLines.reduce((sum, { line, qty }) => sum + Math.round(qty * line.ratePaise), 0)
    + filledManual.reduce((sum, l) => sum + Math.round(Number(l.quantity) * toPaise(l.rateRupees)), 0);
  const gstPaise = pickedLines.reduce(
    (sum, { line, qty }) => sum + Math.round((Math.round(qty * line.ratePaise) * Number(line.gstRatePercent || 0)) / 100),
    0
  );
  const totalPaise = taxablePaise + gstPaise;

  const overPicked = (invoice?.lines || []).some((line) => Number(picked[line.salesInvoiceLineId] || 0) > line.returnableQty);

  const blockedReason = (() => {
    if (!form.factoryId) return 'Select the factory the goods are coming back to.';
    if (!form.customerPartyId) return 'Select the customer returning them.';
    // A quantity that cannot be returned is an error, and outranks a field the
    // person simply has not reached yet.
    if (overPicked) return 'One line is more than that invoice has left to return.';
    if (!pickedLines.length && !filledManual.length) return 'Enter how many of an item are coming back.';
    if (form.reason.trim().length < 3) return 'Say why they are being returned.';
    return null;
  })();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (blockedReason) return;
    setError('');

    const payload = {
      ...form,
      // Sent only when every line came from the invoice: the server checks the
      // quantities against it, and cannot check what it was not given.
      ...(pickedLines.length && !filledManual.length ? { salesInvoiceId: invoiceId } : {}),
      lines: [
        ...pickedLines.map(({ line, qty }) => ({ productId: line.productId, quantity: qty, ratePaise: line.ratePaise })),
        ...filledManual.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), ratePaise: toPaise(l.rateRupees) })),
      ],
    };

    createMutation
      .mutateAsync(payload)
      .then(() => { toast.success('Sales return recorded'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to record sales return.'));
  };

  const setPick = (lineId, value) => setPicked((p) => ({ ...p, [lineId]: value }));
  const setManual = (key, patch) => setManualLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Sales Return</DialogTitle>
          <DialogDescription>Pick the invoice the goods went out on, then say how many are coming back.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 [&>div]:min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="sr-factory">Factory</Label>
              <select id="sr-factory" value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className={SELECT} required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-customer">Customer</Label>
              <SearchableSelect
                id="sr-customer"
                value={form.customerPartyId}
                onChange={(id) => setForm({ ...form, customerPartyId: id })}
                useOptions={useParties}
                filters={{ partyType: PartyType.CUSTOMER, status: 'active' }}
                getOptionLabel={(option) => option.name}
                getOptionHint={(option) => option.code}
                placeholder="Select customer"
                searchPlaceholder="Type a name or code…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-date">Return Date</Label>
              <Input id="sr-date" type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sr-reason">Reason</Label>
            <Input id="sr-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. damaged in transit" required minLength={3} />
          </div>

          {/* What they bought -------------------------------------------------- */}
          {!form.factoryId || !form.customerPartyId ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
              Choose a factory and a customer to see what they bought.
            </p>
          ) : returnable.isLoading ? (
            <div className="h-28 rounded-lg bg-muted/40 animate-pulse" />
          ) : returnable.isError ? (
            <p className="text-sm text-destructive border border-destructive/20 rounded-lg p-4">Could not load this customer&apos;s invoices.</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
              No posted invoices for this customer at this factory. You can still record the return by adding the items below.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="sr-invoice">Invoice the goods went out on</Label>
                <select id="sr-invoice" className={SELECT} value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); setPicked({}); }}>
                  <option value="">Select invoice</option>
                  {invoices.map((i) => (
                    <option key={i.invoiceId} value={i.invoiceId} disabled={i.fullyReturned}>
                      {i.invoiceNumber} · {String(i.invoiceDate).slice(0, 10)} · {formatINR(i.totalPaise)}{i.fullyReturned ? ' · fully returned' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {invoice && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className={cn(ROW, 'px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground')}>
                    <span>Item</span>
                    <span className="text-right">Sold</span>
                    <span className="text-right">Rate / unit</span>
                    <span className="text-right">Returnable</span>
                    <span className="text-right">Coming back</span>
                  </div>
                  {invoice.lines.map((line) => {
                    const value = picked[line.salesInvoiceLineId] ?? '';
                    const tooMany = Number(value || 0) > line.returnableQty;
                    return (
                      <div key={line.salesInvoiceLineId} className={cn(ROW, 'px-3 py-1.5 items-center border-t border-border/50 text-sm')}>
                        <span className="truncate">
                          {line.productName}
                          <span className="block text-xs text-muted-foreground">
                            invoiced {line.soldQty} × {formatINR(line.ratePaise)} = {formatINR(line.soldValuePaise ?? Math.round(line.soldQty * line.ratePaise))}
                            {line.returnedQty > 0 && ` · ${line.returnedQty} already back`}
                          </span>
                        </span>
                        <span className="text-right tabular-nums">{line.soldQty}</span>
                        <span className="text-right tabular-nums">{formatINR(line.ratePaise)}</span>
                        <span className={cn('text-right tabular-nums', line.returnableQty === 0 && 'text-muted-foreground')}>{line.returnableQty}</span>
                        <Input
                          aria-label={`Quantity returned of ${line.productName}`}
                          type="number" step="0.01" min="0" max={line.returnableQty}
                          disabled={line.returnableQty === 0}
                          className={cn('h-8 text-right', tooMany && 'border-destructive text-destructive')}
                          value={value}
                          onChange={(e) => setPick(line.salesInvoiceLineId, e.target.value)}
                        />
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border text-sm">
                    <button
                      type="button" className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      onClick={() => setPicked(Object.fromEntries(
                        invoice.lines.filter((l) => l.returnableQty > 0).map((l) => [l.salesInvoiceLineId, String(l.returnableQty)])
                      ))}
                    >
                      <Undo2 size={13} /> Return everything left on this invoice
                    </button>
                    <span className="tabular-nums">{formatINR(taxablePaise)} + GST</span>
                  </div>
                </div>
              )}

              {unlinked.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Earlier returns with no invoice named: {unlinked.map((u) => `${u.quantity} × ${u.productName}`).join(', ')} — not deducted above.
                </p>
              )}
            </div>
          )}

          {/* Anything not on an invoice ---------------------------------------- */}
          <div className="space-y-2">
            {manualLines.length === 0 ? (
              <button type="button" className="text-xs text-primary hover:underline inline-flex items-center gap-1" onClick={() => setManualLines([emptyLine()])}>
                <Plus size={13} /> Add an item that is not on an invoice
              </button>
            ) : (
              <>
                <Label>Items not on an invoice (creates a new stock lot — BR-01)</Label>
                {manualLines.map((line, index) => (
                  <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_90px_120px_32px] gap-2 items-center">
                    <select
                      aria-label={`Product for extra line ${index + 1}`}
                      className="h-9 w-full min-w-0 px-2 rounded-md border border-input bg-background text-sm truncate"
                      value={line.productId} onChange={(e) => setManual(line.key, { productId: e.target.value })}
                    >
                      <option value="" disabled>Product</option>
                      {(productData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Input aria-label={`Quantity for extra line ${index + 1}`} type="number" step="0.01" min="0" placeholder="Qty" value={line.quantity} onChange={(e) => setManual(line.key, { quantity: e.target.value })} />
                    <Input aria-label={`Rate for extra line ${index + 1}`} type="number" step="0.01" min="0" placeholder="Rate (₹)" value={line.rateRupees} onChange={(e) => setManual(line.key, { rateRupees: e.target.value })} />
                    <button
                      type="button" aria-label={`Remove extra line ${index + 1}`}
                      onClick={() => setManualLines((ls) => ls.filter((l) => l.key !== line.key))}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" className="text-xs text-primary hover:underline inline-flex items-center gap-1" onClick={() => setManualLines((ls) => [...ls, emptyLine()])}>
                  <Plus size={13} /> Add another
                </button>
                <p className="text-xs text-muted-foreground">
                  Mixed with invoice lines, the return is recorded without an invoice reference, so nothing is checked against one.
                </p>
              </>
            )}
          </div>

          <DialogFooter className="items-center">
            {blockedReason ? (
              <p className="text-xs text-muted-foreground mr-auto">{blockedReason}</p>
            ) : (
              <p className="text-sm mr-auto">
                <span className="text-muted-foreground">Taxable {formatINR(taxablePaise)}</span>
                {gstPaise > 0 && <span className="text-muted-foreground"> · GST {formatINR(gstPaise)}</span>}
                <span className="ml-2">Credit to customer <span className="font-semibold tabular-nums">{formatINR(totalPaise)}</span></span>
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!!blockedReason || createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Record Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
