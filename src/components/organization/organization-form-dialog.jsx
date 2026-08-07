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
import { useCreateOrganization, useUpdateOrganization } from '@/hooks/use-organization';

const emptyForm = { name: '', code: '', description: '', status: 'active' };

export function OrganizationFormDialog({ open, onOpenChange, organization }) {
  const isEditing = !!organization;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        organization
          ? {
              name: organization.name || '',
              code: organization.code || '',
              description: organization.description || '',
              status: organization.status || 'active',
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, organization]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      code: form.code || undefined,
      description: form.description || undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: organization.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save organization.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Organization' : 'New Organization'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-code">Code</Label>
            <Input
              id="org-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-description">Description</Label>
            <Input
              id="org-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="org-status">Status</Label>
              <select
                id="org-status"
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
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
