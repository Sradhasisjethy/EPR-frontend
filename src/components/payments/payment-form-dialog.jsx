import { useEffect, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';

/** Party types as a person would say them, for the mixed picker below. */
const PARTY_TYPE_LABEL = {
  VENDOR: 'Vendor',
  CONTRACTOR: 'Contractor',
  LABOUR: 'Labour',
};
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePayment } from '@/hooks/use-payments';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { usePurchaseInvoices } from '@/hooks/use-purchasing';
import { toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';
import { MoneyAccountSelect } from '@/components/ledger/money-account-select';

const emptyMode = { mode: 'CASH', amountRupees: '' };

export function PaymentFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', partyId: '', paymentDate: '' });
  const [modes, setModes] = useState([{ ...emptyMode }]);
  const [allocations, setAllocations] = useState({});
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  // Vendors, contractors, and labour can all be paid — no partyType filter here.
  const { data: invoicesData } = usePurchaseInvoices({ page: 1, limit: 50, vendorPartyId: form.partyId || undefined });
  const unpaidInvoices = (invoicesData?.rows || []).filter((inv) => inv.paymentStatus !== 'PAID');
  const createMutation = useCreatePayment();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', partyId: '', paymentDate: today() });
      setModes([{ ...emptyMode }]);
      setAllocations({});
      setError('');
    }
  }, [open]);

  useEffect(() => setAllocations({}), [form.partyId]);

  const updateMode = (i, field, value) => setModes((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  const addMode = () => setModes((prev) => [...prev, { ...emptyMode }]);
  const removeMode = (i) => setModes((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (modes.some((m) => !m.amountRupees)) {
      setError('Every payment mode needs an amount.');
      return;
    }

    const payload = {
      ...form,
      modes: modes.map((m) => ({ mode: m.mode, amountPaise: toPaise(m.amountRupees), ...(m.accountId ? { accountId: m.accountId } : {}) })),
      allocations: Object.entries(allocations)
        .filter(([, amountRupees]) => amountRupees)
        .map(([invoiceId, amountRupees]) => ({ invoiceId, allocatedAmountPaise: toPaise(amountRupees) })),
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Payment recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to record payment.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Payment (money out)</DialogTitle></DialogHeader>
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
              <Label htmlFor="pay-party">Vendor / Contractor / Labour</Label>
              {/* Money out goes to a vendor, a contractor or a labourer. The
                  list used to be every party in the tenant, so a customer could
                  be paid from a screen that does not mean that. */}
              <SearchableSelect
                id="pay-party"
                value={form.partyId}
                onChange={(id) => setForm({ ...form, partyId: id })}
                useOptions={useParties}
                filters={{ partyTypes: 'VENDOR,CONTRACTOR,LABOUR', status: 'active' }}
                getOptionLabel={(option) => option.name}
                // On a mixed list the kind of party is what tells them apart,
                // not the code the name usually already carries.
                getOptionHint={(option) => PARTY_TYPE_LABEL[option.partyType] || option.partyType}
                placeholder="Select vendor, contractor or labourer"
                searchPlaceholder="Type a name or code…"
                emptyMessage="No vendor, contractor or labourer matches that."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payment Modes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMode}><Plus size={14} /> Add Mode</Button>
            </div>
            {modes.map((m, i) => (
              <div key={i} className="flex gap-2 items-center [&>input]:flex-1 [&>select:first-child]:w-[140px]">
                <select value={m.mode} onChange={(e) => setModes((prev) => prev.map((x, idx) => (idx === i ? { ...x, mode: e.target.value, accountId: undefined } : x)))} className="h-9 px-2 rounded-md border border-input bg-background text-sm">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
                <Input type="number" step="0.01" min="0" placeholder="Amount (₹)" value={m.amountRupees} onChange={(e) => updateMode(i, 'amountRupees', e.target.value)} required />
                <MoneyAccountSelect mode={m.mode} value={m.accountId} onChange={(v) => updateMode(i, 'accountId', v)} aria-label={`Paid from (mode ${i + 1})`} />
                <button type="button" onClick={() => removeMode(i)} disabled={modes.length === 1} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {form.partyId && unpaidInvoices.length > 0 && (
            <div className="space-y-2">
              <Label>Allocate against purchase invoices (optional, BR-19/BR-20)</Label>
              {unpaidInvoices.map((inv) => (
                <div key={inv.id} className="grid grid-cols-[1fr_140px] gap-2 items-center text-sm">
                  <span>{inv.vendorInvoiceNumber} — {inv.invoiceDate} ({inv.paymentStatus})</span>
                  <Input
                    type="number" step="0.01" min="0" placeholder="Allocate (₹)"
                    value={allocations[inv.id] ?? ''}
                    onChange={(e) => setAllocations({ ...allocations, [inv.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Record Payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
