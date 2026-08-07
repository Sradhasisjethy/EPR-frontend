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
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateRole, useUpdateRole } from '@/hooks/use-roles';
import { WebPermissions } from '@/constants/enums';

const emptyForm = { name: '', code: '', description: '', permissions: [], status: 'active' };

export function RoleFormDialog({ open, onOpenChange, role }) {
  const isEditing = !!role;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        role
          ? {
              name: role.name || '',
              code: role.code || '',
              description: role.description || '',
              permissions: role.permissions || [],
              status: role.status || 'active',
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, role]);

  const togglePermission = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      code: form.code || undefined,
      description: form.description || undefined,
      permissions: form.permissions,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: role.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save role.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'New Role'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-code">Code</Label>
            <Input
              id="role-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Input
              id="role-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-md border border-input">
              {Object.values(WebPermissions).map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.permissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                  />
                  {permission.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="role-status">Status</Label>
              <select
                id="role-status"
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
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
