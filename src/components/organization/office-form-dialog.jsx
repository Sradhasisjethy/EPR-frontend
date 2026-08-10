import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganizations, useCreateOffice, useUpdateOffice } from '@/hooks/use-organization';

const emptyForm = {
  organizationId: '',
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  country: '',
  status: 'active',
};

export function OfficeFormDialog({ open, onOpenChange, office, defaultOrganizationId = '' }) {
  const isEditing = !!office;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: orgData } = useOrganizations(1, 100);
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        office
          ? {
              organizationId: office.organizationId || '',
              name: office.name || '',
              code: office.code || '',
              address: office.address || '',
              city: office.city || '',
              state: office.state || '',
              country: office.country || '',
              status: office.status || 'active',
            }
          : { ...emptyForm, organizationId: defaultOrganizationId || '' }
      );
      setError('');
    }
  }, [open, office, defaultOrganizationId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      organizationId: form.organizationId,
      name: form.name,
      code: form.code || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: office.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save office.'));
  };

  const organizations = orgData?.rows || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Office' : 'New Office'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="office-org">Organization</Label>
            <select
              id="office-org"
              value={form.organizationId}
              onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              <option value="" disabled>Select an organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-name">Name</Label>
            <Input
              id="office-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-code">Code</Label>
            <Input
              id="office-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-address">Address</Label>
            <Input
              id="office-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="office-city">City</Label>
              <Input
                id="office-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="office-state">State</Label>
              <Input
                id="office-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-country">Country</Label>
            <Input
              id="office-country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="office-status">Status</Label>
              <select
                id="office-status"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Office'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
