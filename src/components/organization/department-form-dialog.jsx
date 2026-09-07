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
  useOffices,
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
} from '@/hooks/use-organization';
import { useEmployees } from '@/hooks/use-employees';

import { OfficeFormDialog } from './office-form-dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { 
  organizationId: '', 
  officeIds: [], 
  name: '', 
  code: '', 
  parentId: '', 
  headId: '', 
  status: 'active' 
};

export function DepartmentFormDialog({ open, onOpenChange, department, defaultOrganizationId = '' }) {
  const isEditing = !!department;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [quickOfficeDialogOpen, setQuickOfficeDialogOpen] = useState(false);
  const { data: orgData } = useOrganizations({ page: 1, limit: 100 });
  const { data: officeData } = useOffices({ page: 1, limit: 100 });
  const { data: deptData } = useDepartments({ page: 1, limit: 100 });
  const { data: empData } = useEmployees({ page: 1, limit: 100 });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      const initialOfficeIds = department?.offices
        ? department.offices.map((o) => o.id)
        : department?.officeId
        ? [department.officeId]
        : [];

      setForm(
        department
          ? {
              organizationId: department.organizationId || '',
              officeIds: initialOfficeIds,
              name: department.name || '',
              code: department.code || '',
              parentId: department.parentId || '',
              headId: department.headId || '',
              status: department.status || 'active',
            }
          : { ...emptyForm, organizationId: defaultOrganizationId || '' }
      );
      setError('');
    }
  }, [open, department, defaultOrganizationId]);

  const toggleOffice = (officeId) => {
    setForm((prev) => {
      const exists = prev.officeIds.includes(officeId);
      return {
        ...prev,
        officeIds: exists
          ? prev.officeIds.filter((id) => id !== officeId)
          : [...prev.officeIds, officeId],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const organizationId = form.organizationId.trim();
    const name = form.name.trim();
    const code = form.code.trim();

    if (!organizationId || !name || !code) {
      setError('Organization, Department Name, and Code are required fields.');
      return;
    }

    const payload = {
      organizationId,
      name,
      code,
      officeIds: form.officeIds,
      parentId: form.parentId || undefined,
      headId: form.headId || undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: department.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => { toast.success(isEditing ? 'Department updated' : 'Department created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save department.'));
  };

  const organizations = orgData?.rows || [];
  const offices = officeData?.rows || [];
  const departments = (deptData?.rows || []).filter((d) => !department || d.id !== department.id);
  const employees = empData?.rows || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Department' : 'New Department'}</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-org">
                Organization <span className="text-destructive font-bold">*</span>
              </Label>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assigned Offices</Label>
                <button
                  type="button"
                  onClick={() => setQuickOfficeDialogOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  <Plus size={13} />
                  Add New Office
                </button>
              </div>
              {offices.length === 0 ? (
                <div className="p-3 border border-dashed rounded-md text-xs text-muted-foreground text-center">
                  {form.organizationId ? 'No offices created yet. Click "Add New Office" above.' : 'Select an organization to view offices.'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2.5 max-h-32 overflow-y-auto border rounded-md bg-muted/20">
                  {offices.map((off) => {
                    const isSelected = form.officeIds.includes(off.id);
                    return (
                      <button
                        key={off.id}
                        type="button"
                        onClick={() => toggleOffice(off.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {off.name} ({off.city || 'HQ'})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name">
                  Department Name <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="dept-name"
                  placeholder="e.g. Sales"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept-code">
                  Code <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="dept-code"
                  placeholder="e.g. SLS"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-parent">Parent Department</Label>
              <select
                id="dept-parent"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">None (Top-Level)</option>
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

    <OfficeFormDialog
      open={quickOfficeDialogOpen}
      onOpenChange={setQuickOfficeDialogOpen}
      defaultOrganizationId={form.organizationId}
    />
  </>
  );
}
