import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

const emptyMode = { mode: 'CASH', amountRupees: '' };

export function ReceiptFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', customerPartyId: '', receiptDate: '' });
  const [modes, setModes] = useState([{ ...emptyMode }]);
  const [allocations, setAllocations] = useState({}); // invoiceId -> amountRupees
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: customerData } = useParties({ page: 1, limit: 100, partyType: PartyType.CUSTOMER });
  const { data: invoicesData } = useSalesInvoices({ page: 1, limit: 50, customerPartyId: form.customerPartyId || undefined, status: 'POSTED', openOnly: true });
  const createMutation = useCreateReceipt();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', customerPartyId: '', receiptDate: today() });
      setModes([{ ...emptyMode }]);
      setAllocations({});
      setError('');
    }
  }, [open]);

  useEffect(() => setAllocations({}), [form.customerPartyId]);

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
      modes: modes.map((m) => ({ mode: m.mode, amountPaise: toPaise(m.amountRupees) })),
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
              <Label>Customer</Label>
              <select value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select customer</option>
                {(customerData?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Receipt Date</Label>
              <Input type="date" value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payment Modes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMode}><Plus size={14} /> Add Mode</Button>
            </div>
            {modes.map((m, i) => (
              <div key={i} className="grid grid-cols-[140px_1fr_32px] gap-2 items-center">
                <select value={m.mode} onChange={(e) => updateMode(i, 'mode', e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
                <Input type="number" step="0.01" min="0" placeholder="Amount (₹)" value={m.amountRupees} onChange={(e) => updateMode(i, 'amountRupees', e.target.value)} required />
                <button type="button" onClick={() => removeMode(i)} disabled={modes.length === 1} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

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
                            updateMode(0, 'amountRupees', amt);
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
