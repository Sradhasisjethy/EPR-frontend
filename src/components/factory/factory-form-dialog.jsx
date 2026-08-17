import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateFactory, useUpdateFactory } from '@/hooks/use-factory';
import { useOrganizations } from '@/hooks/use-organization';

const emptyForm = {
  organizationId: '',
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  allowNegativeStock: false,
  allowNegativeCash: false,
  status: 'active',
};

export function FactoryFormDialog({ open, onOpenChange, factory }) {
  const isEditing = !!factory;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: orgData } = useOrganizations({ page: 1, limit: 100 });
  const createMutation = useCreateFactory();
  const updateMutation = useUpdateFactory();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        factory
          ? {
              organizationId: factory.organizationId || '',
              name: factory.name || '',
              code: factory.code || '',
              address: factory.address || '',
              city: factory.city || '',
              state: factory.state || '',
              allowNegativeStock: !!factory.allowNegativeStock,
              allowNegativeCash: !!factory.allowNegativeCash,
              status: factory.status || 'active',
            }
          : { ...emptyForm, organizationId: orgData?.rows?.[0]?.id || '' }
      );
      setError('');
    }
  }, [open, factory, orgData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      organizationId: form.organizationId,
      name: form.name,
      code: form.code,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      allowNegativeStock: form.allowNegativeStock,
      allowNegativeCash: form.allowNegativeCash,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: factory.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation.then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to save factory.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Factory' : 'New Factory'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="factory-org">Organization</Label>
            <select
              id="factory-org"
              value={form.organizationId}
              onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              <option value="" disabled>Select organization</option>
              {(orgData?.rows || []).map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="factory-name">Name</Label>
              <Input id="factory-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="factory-code">Code</Label>
              <Input id="factory-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="factory-address">Address</Label>
            <Input id="factory-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="factory-city">City</Label>
              <Input id="factory-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="factory-state">State</Label>
              <Input id="factory-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })}
              />
              Allow negative stock (BR-04 override)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowNegativeCash}
                onChange={(e) => setForm({ ...form, allowNegativeCash: e.target.checked })}
              />
              Allow negative cash balance (BR-21 override)
            </label>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="factory-status">Status</Label>
              <select
                id="factory-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Factory'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
