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
import {
  useOrganizations,
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
} from '@/hooks/use-organization';
import { useEmployees } from '@/hooks/use-employees';

const emptyForm = { organizationId: '', name: '', code: '', parentId: '', headId: '', status: 'active' };

export function DepartmentFormDialog({ open, onOpenChange, department }) {
  const isEditing = !!department;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: orgData } = useOrganizations({ page: 1, limit: 100 });
  const { data: deptData } = useDepartments({ page: 1, limit: 100 });
  const { data: empData } = useEmployees({ page: 1, limit: 100 });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        department
          ? {
              organizationId: department.organizationId || '',
              name: department.name || '',
              code: department.code || '',
              parentId: department.parentId || '',
              headId: department.headId || '',
              status: department.status || 'active',
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, department]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      organizationId: form.organizationId,
      name: form.name,
      code: form.code || undefined,
      parentId: form.parentId || undefined,
      headId: form.headId || undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: department.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save department.'));
  };

  const organizations = orgData?.rows || [];
  const departments = (deptData?.rows || []).filter((d) => !department || d.id !== department.id);
  const employees = empData?.rows || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Department' : 'New Department'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept-org">Organization</Label>
            <select
              id="dept-org"
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
            <Label htmlFor="dept-name">Name</Label>
            <Input
              id="dept-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-code">Code</Label>
            <Input
              id="dept-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-parent">Parent Department</Label>
            <select
              id="dept-parent"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">None</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-head">Department Head</Label>
            <select
              id="dept-head"
              value={form.headId}
              onChange={(e) => setForm({ ...form, headId: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">None</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="dept-status">Status</Label>
              <select
                id="dept-status"
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
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
