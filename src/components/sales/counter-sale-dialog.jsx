import { useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Trash2, Truck, CornerDownRight, Loader2, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductPicker } from '@/components/products/product-picker';
import { LineAvailability } from '@/components/sales/line-availability';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useCounterSaleQuote, useCreateCounterSale } from '@/hooks/use-counter-sales';
import { useOverrideReasonCodes } from '@/hooks/use-bundles';
import { PartyType, ProductType } from '@/constants/enums';
import { formatINR, toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyLine = { productId: '', quantity: '', rateRupees: '', discountPercent: '' };
const WALK_IN = '__walk_in__';

/** Every way a counter sale can be settled, including not yet. */
const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT', label: 'On credit' },
];

/**
 * Selling across the counter.
 *
 * One screen, one transaction: the invoice, the stock issue and the receipt all
 * happen together or none of them do. There is no order to confirm and no
 * challan to raise — a tax invoice is itself a valid document for goods in
 * movement, so a delivered counter sale carries its vehicle on the invoice
 * rather than on a second piece of paper.
 *
 * Laid out as a till, not a form: the item list is a table with an amount
 * against every row, accessories sit under the product that brought them, and
 * the amount to ask for is the largest thing on screen and repeated on the
 * button. The totals are never computed here — they come from the server's own
 * pricing, so the figure quoted to the customer is by construction the figure
 * the invoice is raised for.
 */
export function CounterSaleDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', invoiceDate: '', customerPartyId: WALK_IN });
  const [walkIn, setWalkIn] = useState({ name: '', phone: '', state: '', gstin: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [delivering, setDelivering] = useState(false);
  const [delivery, setDelivery] = useState({ vehicleNumber: '', driverName: '' });
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [error, setError] = useState('');
  // Which accessory is being taken off, and on what grounds. Asked inline
  // rather than in a second modal — a dialog on top of a dialog at a till is
  // worse than the question it is asking.
  const [removing, setRemoving] = useState(null);
  const [removeForm, setRemoveForm] = useState({ reasonCode: '', reasonNote: '' });
  const [removeError, setRemoveError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const createSale = useCreateCounterSale();
  const { data: reasonCodesData } = useOverrideReasonCodes();
  const reasonCodes = (Array.isArray(reasonCodesData) ? reasonCodesData : []).filter((r) => r.isActive !== false);

  const isWalkIn = form.customerPartyId === WALK_IN;
  const collecting = paymentMode !== 'CREDIT';
  const factories = factoryData?.rows || [];

  useEffect(() => {
    if (!open) return;
    setForm({ factoryId: '', invoiceDate: today(), customerPartyId: WALK_IN });
    setWalkIn({ name: '', phone: '', state: '', gstin: '' });
    setLines([{ ...emptyLine }]);
    setDelivering(false);
    setDelivery({ vehicleNumber: '', driverName: '' });
    setPaymentMode('CASH');
    setError('');
    setRemoving(null);
    setRemoveForm({ reasonCode: '', reasonNote: '' });
    setRemoveError('');
  }, [open]);

  // One plant means there is nothing to choose. Leaving it blank only produced
  // a dialog that refused to price anything until the user noticed why.
  useEffect(() => {
    if (open && !form.factoryId && factories.length === 1) {
      setForm((f) => ({ ...f, factoryId: factories[0].id }));
    }
  }, [open, factories, form.factoryId]);

  const customerPayload = useMemo(() => {
    if (!isWalkIn) return { partyId: form.customerPartyId };
    const c = {};
    if (walkIn.name.trim()) c.name = walkIn.name.trim();
    if (walkIn.phone.trim()) c.phone = walkIn.phone.trim();
    if (walkIn.state.trim()) c.state = walkIn.state.trim();
    if (walkIn.gstin.trim()) c.gstin = walkIn.gstin.trim().toUpperCase();
    return Object.keys(c).length ? c : undefined;
  }, [isWalkIn, form.customerPartyId, walkIn]);

  const quoteLines = useMemo(
    () =>
      lines
        .filter((l) => l.productId && Number(l.quantity) > 0)
        .map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          ...(l.rateRupees === '' ? {} : { ratePaise: toPaise(l.rateRupees) }),
          ...(l.discountPercent === '' ? {} : { discountPercent: Number(l.discountPercent) }),
          // productName is kept locally so a removed accessory can still be
          // named on screen once the server stops returning it; the API neither
          // needs nor accepts it.
          ...(l.accessoryOverrides?.length
            ? { accessoryOverrides: l.accessoryOverrides.map(({ productName, ...o }) => o) }
            : {}),
        })),
    [lines]
  );

  const {
    data: quote,
    isFetching: quoting,
    error: quoteError,
  } = useCounterSaleQuote({
    factoryId: form.factoryId,
    invoiceDate: form.invoiceDate,
    customer: isWalkIn
      ? walkIn.state.trim() || walkIn.gstin.trim()
        ? { state: walkIn.state.trim() || undefined, gstin: walkIn.gstin.trim().toUpperCase() || undefined }
        : undefined
      : { partyId: form.customerPartyId },
    lines: quoteLines,
  });

  const totalPaise = quote ? Number(quote.totalPaise) : null;

  /**
   * The priced lines, with each accessory attached to the product that brought
   * it. The server emits them in that order — parent, then its components — so
   * grouping is a walk rather than a lookup.
   */
  const priced = useMemo(() => {
    const groups = [];
    for (const l of quote?.lines || []) {
      if (l.bundleParentProductId && groups.length) groups[groups.length - 1].accessories.push(l);
      else groups.push({ ...l, accessories: [] });
    }
    return groups;
  }, [quote]);

  const pricedFor = (productId) => priced.find((g) => g.productId === productId);

  const updateLine = (i, field, value) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  /**
   * Records a change to one accessory on one line. Passing `null` drops the
   * override entirely, which is what restores a removed accessory or hands a
   * re-typed quantity back to the bundle rule.
   */
  const setAccessoryOverride = (lineIndex, componentProductId, patch) =>
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== lineIndex) return l;
        const rest = (l.accessoryOverrides || []).filter((o) => o.componentProductId !== componentProductId);
        if (!patch) return { ...l, accessoryOverrides: rest };
        const existing = (l.accessoryOverrides || []).find((o) => o.componentProductId === componentProductId) || {};
        const next = { ...existing, ...patch, componentProductId };
        // An emptied box means "back to what the rule says", not zero.
        if (next.qty === '' || next.qty === undefined) delete next.qty;
        if (next.ratePaise === '' || next.ratePaise === undefined) delete next.ratePaise;
        if (next.discountPercent === '' || next.discountPercent === undefined) delete next.discountPercent;
        return { ...l, accessoryOverrides: [...rest, next] };
      })
    );

  const overrideFor = (lineIndex, componentProductId) =>
    (lines[lineIndex]?.accessoryOverrides || []).find((o) => o.componentProductId === componentProductId);

  /** Accessories taken off this line — the server no longer returns them. */
  const removedFor = (lineIndex) => (lines[lineIndex]?.accessoryOverrides || []).filter((o) => o.removed);

  const confirmRemoval = () => {
    const reason = reasonCodes.find((r) => r.code === removeForm.reasonCode);
    if (!reason) return setRemoveError('Choose a reason.');
    if (reason.requiresNote && !removeForm.reasonNote.trim()) {
      return setRemoveError(`"${reason.label}" needs a note.`);
    }
    setAccessoryOverride(removing.lineIndex, removing.componentProductId, {
      removed: true,
      reasonCode: removeForm.reasonCode,
      reasonNote: removeForm.reasonNote.trim() || undefined,
      productName: removing.productName,
    });
    setRemoving(null);
    setRemoveError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.factoryId) return setError('Choose the factory selling the goods.');
    if (!quoteLines.length) return setError('Add at least one product with a quantity.');
    if (isWalkIn && !walkIn.name.trim()) return setError('Enter the buyer’s name, or pick an existing customer.');
    if (delivering && !delivery.vehicleNumber.trim()) return setError('A vehicle number is required for a delivery.');
    if (collecting && totalPaise === null) return setError('Waiting for the total — try again in a moment.');

    try {
      const sale = await createSale.mutateAsync({
        factoryId: form.factoryId,
        invoiceDate: form.invoiceDate,
        customer: customerPayload,
        lines: quoteLines,
        delivery: delivering
          ? { vehicleNumber: delivery.vehicleNumber.trim(), driverName: delivery.driverName.trim() || undefined }
          : null,
        // The server's own quoted total, not a figure retyped here — a counter
        // sale is settled in full or it is a credit sale.
        payment: collecting ? { modes: [{ mode: paymentMode, amountPaise: totalPaise }] } : null,
      });

      toast.success(`Sale complete — ${sale.invoice.invoiceNumber}`, {
        description: collecting
          ? `${formatINR(sale.invoice.totalPaise)} received from ${sale.customer.name}`
          : `${formatINR(sale.invoice.totalPaise)} outstanding from ${sale.customer.name}`,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete the sale.');
    }
  };

  const blockedReason = !form.factoryId
    ? 'Select a factory to price this sale.'
    : !quoteLines.length
      ? 'Add an item to see the total.'
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>New Counter Sale</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-factory">Factory</Label>
              <select
                id="cs-factory"
                value={form.factoryId}
                onChange={(e) => setForm({ ...form, factoryId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="" disabled>Select factory</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-buyer">Buyer</Label>
              {/* Walk-in stays the default and is chosen from the list like any
                  buyer; the rest are searched, because 429 of them do not fit
                  in a dropdown. */}
              <SearchableSelect
                id="cs-buyer"
                value={form.customerPartyId}
                onChange={(id) => setForm({ ...form, customerPartyId: id })}
                useOptions={useParties}
                filters={{ partyType: PartyType.CUSTOMER, status: 'active' }}
                getOptionLabel={(option) => option.name}
                getOptionHint={(option) => option.code}
                emptyOptionLabel="Walk-in customer"
                emptyOptionValue={WALK_IN}
                placeholder="Walk-in customer"
                searchPlaceholder="Type a name or code…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-date">Date</Label>
              <Input id="cs-date" type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} required />
            </div>
          </div>

          {isWalkIn && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1.5">
                <Label htmlFor="cs-name">Name</Label>
                <Input id="cs-name" value={walkIn.name} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} placeholder="Buyer’s name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-phone">Phone</Label>
                <Input id="cs-phone" value={walkIn.phone} onChange={(e) => setWalkIn({ ...walkIn, phone: e.target.value })} placeholder="Recognises repeat buyers" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-state">State</Label>
                <Input id="cs-state" value={walkIn.state} onChange={(e) => setWalkIn({ ...walkIn, state: e.target.value })} placeholder="Factory’s state" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-gstin">GSTIN <span className="text-muted-foreground font-normal">(if registered)</span></Label>
                <Input id="cs-gstin" value={walkIn.gstin} onChange={(e) => setWalkIn({ ...walkIn, gstin: e.target.value })} placeholder="Optional" />
              </div>
            </div>
          )}

          {/* The basket. Column headers because "10" beside "Rate — auto" says
              nothing on its own, and an amount per row so the clerk can answer
              "what's the pipe on its own?" without reading the summary. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus size={14} /> Add Item</Button>
            </div>

            {/* Deliberately NOT overflow-hidden. The product picker opens an
                absolutely-positioned dropdown, and clipping this container cuts
                it off at the table's edge — the results are there, just
                invisible below the fold. The header's corners are rounded
                directly instead, which is all overflow-hidden was buying. */}
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-[minmax(0,1fr)_80px_104px_76px_116px_36px] gap-2 px-3 py-2 rounded-t-lg bg-muted/50 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Disc %</span>
                <span className="text-right">Taxable</span>
                <span />
              </div>

              <div className="divide-y divide-border">
                {lines.map((line, i) => {
                  const group = pricedFor(line.productId);
                  return (
                    <div key={i} className="px-3 py-2.5 space-y-1.5">
                      <div className="grid grid-cols-[minmax(0,1fr)_80px_104px_76px_116px_36px] gap-2 items-center">
                        <ProductPicker
                          value={line.productId}
                          onChange={(id) => updateLine(i, 'productId', id)}
                          filters={{ productType: ProductType.FINISHED_GOOD, status: 'active' }}
                          placeholder="Search products…"
                        />
                        <Input
                          type="number" step="0.01" min="0" placeholder="Qty" className="text-right"
                          value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                        />
                        {/* Blank is not zero: the server prices it from the
                            RETAIL list, then the product's selling price. */}
                        <Input
                          type="number" step="0.01" min="0" placeholder="Auto" className="text-right"
                          value={line.rateRupees} onChange={(e) => updateLine(i, 'rateRupees', e.target.value)}
                        />
                        {/* Comes off the taxable value before GST, so the tax
                            falls with it rather than being charged on a price
                            the customer never paid. */}
                        <Input
                          type="number" step="0.01" min="0" max="100" placeholder="0" className="text-right"
                          aria-label="Discount percent"
                          value={line.discountPercent}
                          onChange={(e) => updateLine(i, 'discountPercent', e.target.value)}
                        />
                        {/* Ex-GST, so this column sums to the "Taxable" row in
                            the summary and the tax is added once, below —
                            the convention every GST invoice follows. Showing the
                            tax-inclusive line total here made the column add up
                            to the grand total instead, so nothing on screen
                            reconciled and the accessory looked excluded. */}
                        <span className="text-right text-sm tabular-nums">
                          {group ? formatINR(group.taxableAmountPaise) : <span className="text-muted-foreground">—</span>}
                        </span>
                        <button
                          type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
                          aria-label="Remove item"
                          className="justify-self-center p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <LineAvailability factoryId={form.factoryId} productId={line.productId} orderedQty={line.quantity} />

                      {/* BR-23: accessories the rule brought with this product,
                          shown under it rather than in the summary — what goes
                          in the customer's van belongs beside what they asked
                          for. */}
                      {(group?.accessories || []).map((a) => {
                        const ov = overrideFor(i, a.productId);
                        return (
                          <div key={a.productId} className="space-y-1">
                            <div className="grid grid-cols-[minmax(0,1fr)_80px_104px_76px_116px_36px] gap-2 items-center text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5 pl-1">
                                <CornerDownRight size={12} className="shrink-0 opacity-60" />
                                {a.productName}
                                <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wide">Included</span>
                              </span>
                              {/* Editable, because a customer taking four pipes
                                  may still want only one gasket. Blank hands the
                                  figure back to the bundle rule. */}
                              <Input
                                type="number" step="0.01" min="0" aria-label={`${a.productName} quantity`}
                                className="h-7 text-right text-xs"
                                placeholder={String(Number(a.quantity))}
                                value={ov?.qty ?? ''}
                                onChange={(e) => setAccessoryOverride(i, a.productId, { qty: e.target.value })}
                              />
                              <Input
                                type="number" step="0.01" min="0" aria-label={`${a.productName} rate`}
                                className="h-7 text-right text-xs"
                                placeholder={String(Number(a.ratePaise) / 100)}
                                value={ov?.ratePaise !== undefined ? Number(ov.ratePaise) / 100 : ''}
                                onChange={(e) =>
                                  setAccessoryOverride(i, a.productId, {
                                    ratePaise: e.target.value === '' ? '' : toPaise(e.target.value),
                                  })
                                }
                              />
                              <Input
                                type="number" step="0.01" min="0" max="100" aria-label={`${a.productName} discount percent`}
                                className="h-7 text-right text-xs" placeholder="0"
                                value={ov?.discountPercent ?? ''}
                                onChange={(e) => setAccessoryOverride(i, a.productId, { discountPercent: e.target.value })}
                              />
                              <span className="text-right tabular-nums">{formatINR(a.taxableAmountPaise)}</span>
                              <button
                                type="button"
                                aria-label={`Remove ${a.productName}`}
                                onClick={() => {
                                  setRemoving({ lineIndex: i, componentProductId: a.productId, productName: a.productName });
                                  setRemoveForm({ reasonCode: reasonCodes.find((r) => !r.requiresNote)?.code || '', reasonNote: '' });
                                  setRemoveError('');
                                }}
                                className="justify-self-center p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Asked once, in place. A reason is required because
                                every removal is recorded against the invoice —
                                that record is what makes "which accessories get
                                dropped, and why" a question worth asking later. */}
                            {removing?.lineIndex === i && removing?.componentProductId === a.productId && (
                              <div className="ml-5 p-2.5 rounded-md border border-border bg-muted/40 space-y-2">
                                <p className="text-xs font-medium text-foreground">Why is {a.productName} coming off?</p>
                                <select
                                  aria-label="Removal reason"
                                  value={removeForm.reasonCode}
                                  onChange={(e) => setRemoveForm((f) => ({ ...f, reasonCode: e.target.value }))}
                                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                                >
                                  <option value="" disabled>Select a reason</option>
                                  {reasonCodes.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                                </select>
                                {reasonCodes.find((r) => r.code === removeForm.reasonCode)?.requiresNote && (
                                  <Input
                                    aria-label="Removal note" className="h-8 text-xs" placeholder="What happened?"
                                    value={removeForm.reasonNote}
                                    onChange={(e) => setRemoveForm((f) => ({ ...f, reasonNote: e.target.value }))}
                                  />
                                )}
                                {removeError && <p className="text-xs text-destructive">{removeError}</p>}
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant="destructive" onClick={confirmRemoval}>Remove</Button>
                                  <Button type="button" size="sm" variant="outline" onClick={() => setRemoving(null)}>Keep it</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Removed accessories stay on screen, struck through, so
                          a mistaken removal is one click back rather than a
                          restarted sale. */}
                      {removedFor(i).map((ov) => (
                        <div
                          key={ov.componentProductId}
                          className="grid grid-cols-[minmax(0,1fr)_80px_104px_76px_116px_36px] gap-2 items-center text-xs text-muted-foreground/70"
                        >
                          <span className="flex items-center gap-1.5 pl-1">
                            <CornerDownRight size={12} className="shrink-0 opacity-40" />
                            <span className="line-through">{ov.productName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wide">
                              Removed — {reasonCodes.find((r) => r.code === ov.reasonCode)?.label || ov.reasonCode}
                            </span>
                          </span>
                          <span />
                          <span />
                          <span />
                          <span />
                          <button
                            type="button"
                            aria-label={`Restore ${ov.productName}`}
                            onClick={() => setAccessoryOverride(i, ov.componentProductId, null)}
                            className="justify-self-center p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          >
                            <Undo2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="space-y-3">
              {/* One control instead of a checkbox plus a dropdown: at a till
                  every option should be one tap away, including not taking the
                  money at all. */}
              <div className="space-y-1.5">
                <Label>Payment</Label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Payment">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={paymentMode === opt.value}
                      onClick={() => setPaymentMode(opt.value)}
                      className={cn(
                        'px-3 h-9 rounded-md border text-sm transition-colors',
                        paymentMode === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:bg-muted/60'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {!collecting && (
                  <p className="text-xs text-muted-foreground">
                    The invoice is raised now; the balance stays outstanding against the buyer.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={delivering} onChange={(e) => setDelivering(e.target.checked)} className="rounded border-input" />
                  <Truck size={15} className="text-muted-foreground" /> Deliver to the customer
                </label>
                {delivering && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Vehicle number" value={delivery.vehicleNumber} onChange={(e) => setDelivery({ ...delivery, vehicleNumber: e.target.value })} />
                    <Input placeholder="Driver (optional)" value={delivery.driverName} onChange={(e) => setDelivery({ ...delivery, driverName: e.target.value })} />
                  </div>
                )}
              </div>
            </div>

            {/* Priced by the server, so this is the invoice figure, not an estimate. */}
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-sm">
              {quoteError ? (
                <p className="text-destructive text-xs">{quoteError.response?.data?.message || 'Could not price this sale.'}</p>
              ) : blockedReason ? (
                <p className="text-muted-foreground text-xs">{blockedReason}</p>
              ) : !quote ? (
                <p className="flex items-center gap-1.5 text-muted-foreground text-xs"><Loader2 size={12} className="animate-spin" /> Pricing…</p>
              ) : (
                <div className="space-y-1.5">
                  {Number(quote.discountPaise) > 0 && (
                    <Row label="Discount" value={`− ${formatINR(quote.discountPaise)}`} />
                  )}
                  <Row label="Taxable" value={formatINR(quote.subtotalPaise)} />
                  {Number(quote.igstPaise) > 0 ? (
                    <Row label="IGST" value={formatINR(quote.igstPaise)} />
                  ) : (
                    <>
                      <Row label="CGST" value={formatINR(quote.cgstPaise)} />
                      <Row label="SGST" value={formatINR(quote.sgstPaise)} />
                    </>
                  )}
                  {Number(quote.roundOffPaise) !== 0 && <Row label="Round off" value={formatINR(quote.roundOffPaise)} />}
                  <div className="pt-2 mt-1 border-t border-border">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {collecting ? 'To collect' : 'Outstanding'}
                    </p>
                    <p className="text-2xl font-semibold tabular-nums leading-tight">{formatINR(quote.totalPaise)}</p>
                    {quoting && (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Loader2 size={10} className="animate-spin" /> Updating…
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createSale.isPending || (collecting && totalPaise === null)}>
              {createSale.isPending
                ? 'Completing…'
                : !collecting
                  ? 'Complete on credit'
                  : totalPaise !== null
                    ? `Take ${formatINR(totalPaise)}`
                    : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
