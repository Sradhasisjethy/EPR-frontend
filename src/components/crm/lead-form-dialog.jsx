import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLead, useUpdateLead, useLeadSources } from '@/hooks/use-crm';
import { useEmployees } from '@/hooks/use-employees';
import { toPaise, fromPaise } from '@/lib/money';
import { toast } from 'sonner';

const SELECT = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm';
const label = (source) => source.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const blank = () => ({
  name: '', contactName: '', phone: '', email: '', city: '', state: '',
  source: 'PHONE', valueRupees: '', expectedCloseDate: '', ownerId: '', requirement: '',
});

export function LeadFormDialog({ open, onOpenChange, lead = null }) {
  const editing = !!lead;
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const { data: sources = [] } = useLeadSources();
  const { data: employeeData } = useEmployees({ page: 1, limit: 200 }, { enabled: open });
  const create = useCreateLead();
  const update = useUpdateLead();

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(lead
      ? {
          name: lead.name || '', contactName: lead.contactName || '', phone: lead.phone || '', email: lead.email || '',
          city: lead.city || '', state: lead.state || '', source: lead.source || 'PHONE',
          valueRupees: lead.estimatedValuePaise ? fromPaise(lead.estimatedValuePaise) : '',
          expectedCloseDate: lead.expectedCloseDate || '', ownerId: lead.ownerId || '', requirement: lead.requirement || '',
        }
      : blank());
  }, [open, lead]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      contactName: form.contactName || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      state: form.state || null,
      source: form.source,
      estimatedValuePaise: form.valueRupees === '' ? null : toPaise(form.valueRupees),
      expectedCloseDate: form.expectedCloseDate || null,
      ownerId: form.ownerId || null,
      requirement: form.requirement || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: lead.id, ...payload });
        toast.success('Lead updated');
      } else {
        const created = await create.mutateAsync(payload);
        toast.success(`${created.leadNumber} added`);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the lead.');
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${lead.leadNumber}` : 'New Lead'}</DialogTitle>
          <DialogDescription>An enquiry worth following up — a contractor, a builder, a government tender.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ld-name">Company / person</Label>
              <Input id="ld-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Konark Infra Projects" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-contact">Contact person</Label>
              <Input id="ld-contact" value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-phone">Phone</Label>
              <Input id="ld-phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-email">Email</Label>
              <Input id="ld-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-city">City</Label>
              <Input id="ld-city" value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-state">State</Label>
              <Input id="ld-state" value={form.state} onChange={(e) => set({ state: e.target.value })} placeholder="Odisha" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ld-source">Came from</Label>
              <select id="ld-source" className={SELECT} value={form.source} onChange={(e) => set({ source: e.target.value })}>
                {sources.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-value">Worth about (₹)</Label>
              <Input id="ld-value" type="number" step="0.01" min="0" value={form.valueRupees} onChange={(e) => set({ valueRupees: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-close">Expected by</Label>
              <Input id="ld-close" type="date" value={form.expectedCloseDate} onChange={(e) => set({ expectedCloseDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-owner">Owner</Label>
              <select id="ld-owner" className={SELECT} value={form.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
                <option value="">Me</option>
                {(employeeData?.rows || []).map((e) => (
                  <option key={e.id} value={e.id}>{[e.firstName, e.lastName].filter(Boolean).join(' ') || e.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ld-req">What do they need?</Label>
            <Input id="ld-req" value={form.requirement} onChange={(e) => set({ requirement: e.target.value })} placeholder="e.g. 600mm RCC pipes for a drainage contract" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : editing ? 'Save changes' : 'Add lead'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
