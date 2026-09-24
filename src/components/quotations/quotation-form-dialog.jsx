import { useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ProductPicker } from '@/components/products/product-picker';
import { useCreateQuotation, useUpdateQuotation } from '@/hooks/use-quotations';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { formatINR, toPaise, fromPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const SELECT = 'w-full min-w-0 h-9 px-3 rounded-md border border-input bg-background text-sm';

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), productId: '', qty: '', rate: '', discount: '' });

/** 30 days from today, the usual validity on a quote. */
const defaultValidity = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

/**
 * `lead` opens the form for a CRM lead: the buyer is filled in from the lead
 * and the saved quotation is linked to it, which moves that lead to Quoted.
 */
export function QuotationFormDialog({ open, onOpenChange, quotation = null, lead = null }) {
  const editing = !!quotation;
  const [factoryId, setFactoryId] = useState('');
  const [buyerMode, setBuyerMode] = useState('CUSTOMER');
  const [customerPartyId, setCustomerPartyId] = useState('');
  const [prospect, setProspect] = useState({ name: '', phone: '', state: '' });
  const [dates, setDates] = useState({ quotationDate: today(), validUntil: defaultValidity() });
  const [lines, setLines] = useState([emptyLine()]);
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const create = useCreateQuotation();
  const update = useUpdateQuotation();
  const factories = factoryData?.rows || [];

  useEffect(() => {
    if (!open) return;
    setError('');
    if (quotation) {
      setFactoryId(quotation.factoryId);
      setBuyerMode(quotation.customerPartyId ? 'CUSTOMER' : 'PROSPECT');
      setCustomerPartyId(quotation.customerPartyId || '');
      setProspect({ name: quotation.prospectName || '', phone: quotation.prospectPhone || '', state: quotation.prospectState || '' });
      setDates({ quotationDate: quotation.quotationDate, validUntil: quotation.validUntil });
      setTerms(quotation.terms || '');
      setNotes(quotation.notes || '');
      setLines(
        quotation.lines
          .filter((l) => !l.bundleParentProductId)
          .map((l) => ({
            key: l.id, productId: l.productId, qty: String(l.quantity),
            rate: fromPaise(l.ratePaise), discount: l.discountPercent ? String(l.discountPercent) : '',
          }))
      );
    } else if (lead) {
      setBuyerMode(lead.customerPartyId ? 'CUSTOMER' : 'PROSPECT');
      setCustomerPartyId(lead.customerPartyId || '');
      setProspect({ name: lead.name || '', phone: lead.phone || '', state: lead.state || '' });
      setDates({ quotationDate: today(), validUntil: defaultValidity() });
      setLines([emptyLine()]);
      setTerms('');
      setNotes(lead.requirement || '');
    } else {
      setBuyerMode('CUSTOMER');
      setCustomerPartyId('');
      setProspect({ name: '', phone: '', state: '' });
      setDates({ quotationDate: today(), validUntil: defaultValidity() });
      setLines([emptyLine()]);
      setTerms('');
      setNotes('');
    }
  }, [open, quotation, lead]);

  useEffect(() => {
    if (open && !factoryId && factories.length === 1) setFactoryId(factories[0].id);
  }, [open, factoryId, factories]);

  const setLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const filled = lines.filter((l) => l.productId && Number(l.qty) > 0);

  // Only what was typed. GST, bundle accessories and rounding are the server's
  // to work out — the saved quotation shows the real figures.
  const typedValue = useMemo(
    () => filled.reduce((sum, l) => {
      const gross = Math.round(Number(l.qty) * toPaise(l.rate));
      return sum + gross - Math.round((gross * Number(l.discount || 0)) / 100);
    }, 0),
    [filled]
  );
  const anyRateBlank = filled.some((l) => l.rate === '');

  const blockedReason = (() => {
    if (!factoryId) return 'Select a factory.';
    if (buyerMode === 'CUSTOMER' && !customerPartyId) return 'Choose the customer.';
    if (buyerMode === 'PROSPECT' && !prospect.name.trim()) return 'Give the name of the person you are quoting.';
    if (dates.validUntil < dates.quotationDate) return 'The validity date cannot be before the quotation date.';
    if (!filled.length) return 'Add at least one product with a quantity.';
    return null;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blockedReason) return;
    setError('');
    const payload = {
      ...dates,
      ...(buyerMode === 'CUSTOMER'
        ? { customerPartyId }
        : { prospect: { name: prospect.name.trim(), ...(prospect.phone ? { phone: prospect.phone.trim() } : {}), ...(prospect.state ? { state: prospect.state } : {}) } }),
      lines: filled.map((l) => ({
        productId: l.productId,
        quantity: Number(l.qty),
        ...(l.rate === '' ? {} : { ratePaise: toPaise(l.rate) }),
        ...(l.discount ? { discountPercent: Number(l.discount) } : {}),
      })),
      terms: terms || undefined,
      notes: notes || undefined,
      ...(lead ? { leadId: lead.id } : {}),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: quotation.id, ...payload });
        toast.success(`${quotation.quotationNumber} updated`);
      } else {
        const saved = await create.mutateAsync({ factoryId, ...payload });
        toast.success(`${saved.quotationNumber} created — ${formatINR(saved.totalPaise)}`);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the quotation.');
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${quotation.quotationNumber}` : 'New Quotation'}</DialogTitle>
          <DialogDescription>Quote an existing customer or someone who is not on the books yet. GST and any accessories are added when you save.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qt-factory">Factory</Label>
              <select id="qt-factory" className={SELECT} value={factoryId} onChange={(e) => setFactoryId(e.target.value)} disabled={editing}>
                <option value="">Select factory</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-date">Date</Label>
              <Input id="qt-date" type="date" value={dates.quotationDate} onChange={(e) => setDates((d) => ({ ...d, quotationDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-valid">Valid until</Label>
              <Input id="qt-valid" type="date" value={dates.validUntil} min={dates.quotationDate} onChange={(e) => setDates((d) => ({ ...d, validUntil: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-buyer-mode">Quoting</Label>
              <select id="qt-buyer-mode" className={SELECT} value={buyerMode} onChange={(e) => setBuyerMode(e.target.value)}>
                <option value="CUSTOMER">An existing customer</option>
                <option value="PROSPECT">Someone new</option>
              </select>
            </div>
          </div>

          {buyerMode === 'CUSTOMER' ? (
            <div className="space-y-1.5">
              <Label htmlFor="qt-customer">Customer</Label>
              <SearchableSelect
                id="qt-customer"
                value={customerPartyId}
                onChange={(id) => setCustomerPartyId(id)}
                useOptions={useParties}
                filters={{ partyType: PartyType.CUSTOMER, status: 'active' }}
                getOptionLabel={(option) => option.name}
                getOptionHint={(option) => option.code}
                placeholder="Select customer"
                searchPlaceholder="Type a name or code…"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qt-prospect">Name</Label>
                <Input id="qt-prospect" value={prospect.name} onChange={(e) => setProspect((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sahoo Contractors" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qt-phone">Phone</Label>
                <Input id="qt-phone" value={prospect.phone} onChange={(e) => setProspect((p) => ({ ...p, phone: e.target.value }))} inputMode="tel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qt-state">State</Label>
                <Input id="qt-state" value={prospect.state} onChange={(e) => setProspect((p) => ({ ...p, state: e.target.value }))} placeholder="Odisha" />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_120px_90px_36px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30 rounded-t-lg">
              <span>Product</span><span className="text-right">Qty</span><span className="text-right">Rate (₹)</span><span className="text-right">Disc %</span><span />
            </div>
            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_90px_120px_90px_36px] gap-2 px-3 py-1.5 items-center">
                <ProductPicker value={line.productId} onChange={(v) => setLine(line.key, { productId: v })} />
                <Input aria-label={`Quantity line ${index + 1}`} type="number" step="0.01" min="0" className="text-right" value={line.qty} onChange={(e) => setLine(line.key, { qty: e.target.value })} />
                <Input aria-label={`Rate line ${index + 1}`} type="number" step="0.01" min="0" className="text-right" placeholder="List price" value={line.rate} onChange={(e) => setLine(line.key, { rate: e.target.value })} />
                <Input aria-label={`Discount line ${index + 1}`} type="number" step="0.01" min="0" max="100" className="text-right" value={line.discount} onChange={(e) => setLine(line.key, { discount: e.target.value })} />
                <button
                  type="button" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive disabled:opacity-30"
                  onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <button type="button" className="inline-flex items-center gap-1 text-primary text-sm hover:underline" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                <Plus size={14} /> Add line
              </button>
              <span className={cn('text-sm', anyRateBlank && 'text-muted-foreground')}>
                {anyRateBlank ? 'Blank rates come from the price list' : `Before GST: ${formatINR(typedValue)}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qt-terms">Terms (optional)</Label>
              <Input id="qt-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. Ex-works, 50% advance, delivery in 3 weeks" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-notes">Notes (optional)</Label>
              <Input id="qt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="items-center">
            {blockedReason && <p className="text-xs text-muted-foreground mr-auto">{blockedReason}</p>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!!blockedReason || pending}>{pending ? 'Saving…' : editing ? 'Save changes' : 'Create quotation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
