import { useEffect, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  usePartyAddresses, useCreatePartyAddress, useUpdatePartyAddress, useDeletePartyAddress,
} from '@/hooks/use-party-addresses';

const EMPTY = {
  label: '', line1: '', line2: '', city: '', state: '', pincode: '', gstin: '',
  contactPerson: '', phone: '', isBilling: true, isShipping: true,
};

/**
 * FR-M04-2. The state field is the one that matters commercially: GST place of
 * supply is taken from the SHIPPING address, so this dialog says so rather than
 * leaving a user to wonder why an invoice came out as IGST.
 */
export function PartyAddressesDialog({ open, onOpenChange, party }) {
  const partyId = party?.id;
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const { data: addresses, isLoading } = usePartyAddresses(open ? partyId : null);
  const createAddress = useCreatePartyAddress(partyId);
  const updateAddress = useUpdatePartyAddress(partyId);
  const deleteAddress = useDeletePartyAddress(partyId);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setEditingId(null);
      setError('');
    }
  }, [open]);

  const startEdit = (address) => {
    setEditingId(address.id);
    setForm({ ...EMPTY, ...address });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      label: form.label || 'Main',
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      pincode: form.pincode || undefined,
      gstin: form.gstin || undefined,
      contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined,
      isBilling: !!form.isBilling,
      isShipping: !!form.isShipping,
    };

    const mutation = editingId ? updateAddress : createAddress;
    mutation
      .mutateAsync(editingId ? { id: editingId, ...payload } : payload)
      .then(() => { setForm(EMPTY); setEditingId(null); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save the address.'));
  };

  const setDefault = (address, kind) => {
    updateAddress
      .mutateAsync({ id: address.id, [kind === 'billing' ? 'isDefaultBilling' : 'isDefaultShipping']: true })
      .catch((err) => setError(err.response?.data?.message || 'Failed to set the default.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Addresses — {party?.name}</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <div className="space-y-4">
          <div className="space-y-2">
            {isLoading ? (
              <div className="h-20 rounded-lg border border-border bg-card animate-pulse" />
            ) : !addresses?.length ? (
              <p className="text-sm text-muted-foreground">No addresses yet. Add one below.</p>
            ) : (
              addresses.map((address) => (
                <div key={address.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {address.label}
                      {address.stateCode && (
                        <span className="ml-2 text-xs text-muted-foreground">state code {address.stateCode}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {address.isDefaultBilling && <Tag>Default billing</Tag>}
                      {address.isDefaultShipping && <Tag tone="primary">Default shipping</Tag>}
                      {address.gstin && <Tag>{address.gstin}</Tag>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!address.isDefaultShipping && address.isShipping && (
                      <button
                        onClick={() => setDefault(address, 'shipping')}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Make default shipping (drives GST place of supply)"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button onClick={() => startEdit(address)} className="text-xs text-primary hover:underline px-1">Edit</button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete the "${address.label}" address?`)) deleteAddress.mutate(address.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-border">
            <p className="text-sm font-medium">{editingId ? 'Edit address' : 'Add an address'}</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Head Office / Site" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address line 1</Label>
                <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Odisha" />
              </div>
              <div className="space-y-1.5">
                <Label>PIN</Label>
                <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>GSTIN</Label>
                <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              The state on the <strong>shipping</strong> address decides GST place of supply — same state as the
              factory bills CGST+SGST, a different state bills IGST. The two-digit code is derived automatically.
            </p>

            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.isBilling} onChange={(e) => setForm({ ...form, isBilling: e.target.checked })} />
                Use for billing
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.isShipping} onChange={(e) => setForm({ ...form, isShipping: e.target.checked })} />
                Use for shipping
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createAddress.isPending || updateAddress.isPending}>
                <Plus size={14} /> {editingId ? 'Save changes' : 'Add address'}
              </Button>
              {editingId && (
                <Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tag({ children, tone }) {
  return (
    <span className={cn(
      'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
      tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
    )}>
      {children}
    </span>
  );
}
