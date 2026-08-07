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
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/use-employees';
import { useOrganizations, useOffices, useDepartments } from '@/hooks/use-organization';
import { EmployeeType, EmployeeStatus, SystemRoles } from '@/constants/enums';

const emptyForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  organizationId: '',
  officeId: '',
  departmentId: '',
  employeeType: EmployeeType.FULL_TIME,
  role: SystemRoles.EMPLOYEE,
  phone: '',
  employeeCode: '',
  status: EmployeeStatus.ONBOARDING,
};

export function EmployeeFormDialog({ open, onOpenChange, employee }) {
  const isEditing = !!employee;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: orgData } = useOrganizations(1, 100);
  const { data: offData } = useOffices(1, 100);
  const { data: deptData } = useDepartments(1, 100);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        employee
          ? {
              email: employee.email || '',
              password: '',
              firstName: employee.firstName || '',
              lastName: employee.lastName || '',
              organizationId: employee.organizationId || '',
              officeId: employee.officeId || '',
              departmentId: employee.departmentId || '',
              employeeType: employee.employeeType || EmployeeType.FULL_TIME,
              role: employee.role || SystemRoles.EMPLOYEE,
              phone: employee.phone || '',
              employeeCode: employee.employeeCode || '',
              status: employee.status || EmployeeStatus.ONBOARDING,
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, employee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isEditing) {
      const payload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        organizationId: form.organizationId || undefined,
        officeId: form.officeId || undefined,
        departmentId: form.departmentId || undefined,
        employeeType: form.employeeType,
        role: form.role,
        phone: form.phone || undefined,
        employeeCode: form.employeeCode || undefined,
        status: form.status,
      };
      updateMutation
        .mutateAsync({ id: employee.id, ...payload })
        .then(() => onOpenChange(false))
        .catch((err) => setError(err.response?.data?.message || 'Failed to save employee.'));
    } else {
      const payload = {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        organizationId: form.organizationId || undefined,
        officeId: form.officeId || undefined,
        departmentId: form.departmentId || undefined,
        employeeType: form.employeeType,
        role: form.role,
        phone: form.phone || undefined,
        employeeCode: form.employeeCode || undefined,
      };
      createMutation
        .mutateAsync(payload)
        .then(() => onOpenChange(false))
        .catch((err) => setError(err.response?.data?.message || 'Failed to create employee.'));
    }
  };

  const organizations = orgData?.rows || [];
  const offices = offData?.rows || [];
  const departments = deptData?.rows || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employee' : 'New Employee'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-firstName">First Name</Label>
              <Input
                id="emp-firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-lastName">Last Name</Label>
              <Input
                id="emp-lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="emp-password">Password</Label>
              <Input
                id="emp-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input
                id="emp-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-code">Employee Code</Label>
              <Input
                id="emp-code"
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-org">Organization</Label>
            <select
              id="emp-org"
              value={form.organizationId}
              onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">None</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-office">Office</Label>
              <select
                id="emp-office"
                value={form.officeId}
                onChange={(e) => setForm({ ...form, officeId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">None</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>{office.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-dept">Department</Label>
              <select
                id="emp-dept"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">None</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-type">Employee Type</Label>
              <select
                id="emp-type"
                value={form.employeeType}
                onChange={(e) => setForm({ ...form, employeeType: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Object.values(EmployeeType).map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-role">Role</Label>
              <select
                id="emp-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Object.values(SystemRoles).map((r) => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="emp-status">Status</Label>
              <select
                id="emp-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Object.values(EmployeeStatus).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
