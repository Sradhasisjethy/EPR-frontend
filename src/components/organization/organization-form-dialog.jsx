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
import { toast } from 'sonner';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CODE_REGEX = /^[A-Za-z0-9_-]{2,15}$/;

const emptyForm = { name: '', code: '', gstin: '', description: '', status: 'active' };

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
              gstin: organization.gstin || '',
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

    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    const gstin = form.gstin.trim().toUpperCase();

    if (!name || name.length < 2) {
      setError('Organization name must be at least 2 characters.');
      return;
    }

    if (!code || !CODE_REGEX.test(code)) {
      setError('Code must be 2-15 alphanumeric characters without spaces (e.g. ACS).');
      return;
    }

    if (!gstin) {
      setError('GSTIN is required.');
      return;
    }

    if (!GSTIN_REGEX.test(gstin)) {
      setError('GSTIN must be 15 characters, e.g. 21ABCDE1234F1Z5');
      return;
    }

    const payload = {
      name,
      code,
      gstin,
      description: form.description?.trim() || undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: organization.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => { toast.success(isEditing ? 'Organisation updated' : 'Organisation created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save organization.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Organization' : 'New Organization'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">
              Name <span className="text-destructive font-bold">*</span>
            </Label>
            <Input
              id="org-name"
              placeholder="e.g. Acme Concrete Solutions"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-code">
                Code <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="org-code"
                placeholder="e.g. ACS"
                value={form.code}
                maxLength={15}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-gstin">
                GSTIN <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="org-gstin"
                placeholder="21ABCDE1234F1Z5"
                maxLength={15}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                required
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground -mt-2">
            GSTIN must be 15 characters (e.g. <span className="font-mono text-primary font-semibold">21ABCDE1234F1Z5</span>)
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="org-description">Description</Label>
            <Input
              id="org-description"
              placeholder="Optional description"
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
