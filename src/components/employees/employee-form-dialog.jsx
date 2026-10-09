import { Mail, MapPin, Laptop, Camera, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
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
import { useRoles } from '@/hooks/use-roles';
import { EmployeeType, EmployeeStatus, SystemRoles } from '@/constants/enums';
import { toast } from 'sonner';
import { usePincodeLookup } from '@/hooks/use-pincode';

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
  roleId: '',
  phone: '',
  gender: '',
  employeeCode: '',
  dateOfJoining: '',
  resignationDate: '',
  assetName: '',
  assetCode: '',
  avatar: '',
  status: EmployeeStatus.ONBOARDING,
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
};

export function EmployeeFormDialog({ open, onOpenChange, employee }) {
  const isEditing = !!employee;
  const [form, setForm] = useState(emptyForm);

  // The PIN code fills city, state and country, so only the street address has
  // to be typed. Every field stays editable.
  const pincodeStatus = usePincodeLookup(form.pincode, {
    onResolved: (address) =>
      setForm((previous) => ({
        ...previous,
        city: address.city || previous.city,
        state: address.state || previous.state,
        country: address.country || previous.country,
      })),
  });
  const [error, setError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { data: orgData } = useOrganizations({ page: 1, limit: 100 }, { enabled: open });
  const { data: offData } = useOffices({ page: 1, limit: 100 }, { enabled: open });
  const { data: deptData } = useDepartments({ page: 1, limit: 100 }, { enabled: open });
  const { data: rolesData } = useRoles({ page: 1, limit: 100 }, { enabled: open });
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
              roleId: employee.AdGroupMembers?.[0]?.adGroupId || employee.roleId || '',
              phone: employee.phone || '',
              gender: employee.gender || '',
              employeeCode: employee.employeeCode || '',
              dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '',
              resignationDate: employee.resignationDate ? employee.resignationDate.slice(0, 10) : '',
              assetName: employee.assetName || '',
              assetCode: employee.assetCode || '',
              avatar: employee.avatar || '',
              status: employee.status || EmployeeStatus.ONBOARDING,
              address: employee.address || '',
              city: employee.city || '',
              state: employee.state || '',
              pincode: employee.pincode || '',
              country: employee.country || '',
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, employee]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce 2 MB maximum upload size limit
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`Image size exceeds 2 MB limit (selected: ${fileSizeMB} MB). Please choose a smaller image.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setError('');
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiClient.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url || res.data?.url;
      setForm((prev) => ({ ...prev, avatar: url }));
    } catch (err) {
      // No fallback to storing the image inline as a data: URL. The server only
      // accepts avatar paths it issued, and a file it just refused (wrong type,
      // not really an image) must not reach the profile by another route.
      toast.error(err.response?.data?.message || 'Could not upload the photo. Please try another image.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isEditing) {
      const payload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        organizationId: form.organizationId || null,
        officeId: form.officeId || null,
        departmentId: form.departmentId || null,
        employeeType: form.employeeType,
        role: form.role,
        phone: form.phone || null,
        gender: form.gender || null,
        employeeCode: form.employeeCode || null,
        dateOfJoining: form.dateOfJoining || null,
        resignationDate: form.resignationDate || null,
        assetName: form.assetName || null,
        assetCode: form.assetCode || null,
        // Sent only when changed: an employee saved before the server checked
        // avatar paths may still hold a data: URL, and re-sending it untouched
        // would make every other edit to that employee fail validation.
        ...(form.avatar !== (employee.avatar || '') ? { avatar: form.avatar || null } : {}),
        status: form.status,
        roleId: form.roleId || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        country: form.country || null,
      };
      updateMutation
        .mutateAsync({ id: employee.id, ...payload })
        .then(() => { toast.success(isEditing ? 'Employee updated' : 'Employee added'); onOpenChange(false); })
        .catch((err) => setError(err.response?.data?.message || 'Failed to save employee.'));
    } else {
      const payload = {
        email: form.email,
        password: form.password || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        organizationId: form.organizationId || null,
        officeId: form.officeId || null,
        departmentId: form.departmentId || null,
        employeeType: form.employeeType,
        role: form.role,
        roleId: form.roleId || null,
        phone: form.phone || null,
        gender: form.gender || null,
        employeeCode: form.employeeCode || null,
        dateOfJoining: form.dateOfJoining || null,
        resignationDate: form.resignationDate || null,
        assetName: form.assetName || null,
        assetCode: form.assetCode || null,
        avatar: form.avatar || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        country: form.country || null,
      };
      createMutation
        .mutateAsync(payload)
        .then(() => { toast.success(isEditing ? 'Employee updated' : 'Employee added'); onOpenChange(false); })
        .catch((err) => setError(err.response?.data?.message || 'Failed to create employee.'));
    }
  };

  const organizations = orgData?.rows || [];
  const offices = offData?.rows || [];
  const departments = deptData?.rows || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto w-[96vw] max-w-6xl sm:max-w-6xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employee' : 'New Employee'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile Photo Upload */}
          <div className="flex items-center gap-5 p-4 rounded-xl border border-border/80 bg-muted/20">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 bg-muted/40 overflow-hidden flex items-center justify-center transition-all shadow-sm">
                {form.avatar ? (
                  <img
                    src={form.avatar}
                    alt="Employee preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="w-6 h-6 stroke-[1.5] mb-0.5 text-primary/70" />
                    <span className="text-[10px] font-medium text-muted-foreground">Add Photo</span>
                  </div>
                )}
              </div>
              {form.avatar && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, avatar: '' }))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground p-1 rounded-full shadow-md hover:opacity-90 transition-opacity"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Employee Profile Photo</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Max 2 MB
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload a clear portrait photo. Supported formats: JPG, PNG, WEBP (Max 2 MB).
              </p>
              <div className="flex items-center gap-3 pt-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent text-xs font-medium cursor-pointer shadow-sm transition-colors">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>{isUploadingAvatar ? 'Uploading...' : form.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </label>
                {form.avatar && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, avatar: '' }))}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basic Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {!isEditing && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-start gap-2.5">
              <Mail className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-xs">Automated Onboarding Email</span>
                <span className="opacity-90 leading-relaxed">
                  An invitation email with a secure link will be sent to the employee so they can create their own password.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input
                id="emp-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-gender">Gender</Label>
              <select
                id="emp-gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-code">Employee Code</Label>
              <Input
                id="emp-code"
                placeholder="e.g. EMP-001"
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-doj">Date of Joining</Label>
              <Input
                id="emp-doj"
                type="date"
                value={form.dateOfJoining}
                onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-resignation">Resignation Date</Label>
              <Input
                id="emp-resignation"
                type="date"
                value={form.resignationDate}
                onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
              />
            </div>
          </div>

          {/* Organization & Role */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className={`grid grid-cols-1 gap-4 ${isEditing ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="emp-assigned-role">Assigned Role</Label>
                <span className="text-[10px] text-muted-foreground">Permissions</span>
              </div>
              <select
                id="emp-assigned-role"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-primary/40 bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="">None (Baseline Employee)</option>
                {(rolesData?.rows || rolesData || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emp-role">System Privilege</Label>
                <span className="text-[10px] text-muted-foreground">Access level</span>
              </div>
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
          </div>

          {/* Address Section */}
          <div className="pt-3 border-t border-border/60 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Address Details</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-address">Street Address</Label>
              <Input
                id="emp-address"
                placeholder="e.g. Plot No. 124, Saheed Nagar, Janpath"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emp-pincode">Pincode / Postal Code</Label>
                <Input
                  id="emp-pincode"
                  placeholder="e.g. 751007"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
                {pincodeStatus === 'loading' && (
                  <p className="text-xs text-muted-foreground">Looking up city and state…</p>
                )}
                {pincodeStatus === 'resolved' && (
                  <p className="text-xs text-muted-foreground">Filled from the PIN code — edit if needed.</p>
                )}
                {(pincodeStatus === 'notfound' || pincodeStatus === 'error') && (
                  <p className="text-xs text-muted-foreground">Enter the city and state below.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-city">City</Label>
                <Input
                  id="emp-city"
                  placeholder="e.g. Bhubaneswar"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-state">State / Province</Label>
                <Input
                  id="emp-state"
                  placeholder="e.g. Odisha"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-country">Country</Label>
                <Input
                  id="emp-country"
                  placeholder="e.g. India"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Asset Section */}
          <div className="pt-3 border-t border-border/60 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Laptop className="w-4 h-4 text-primary" />
              <span>Assigned Asset Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emp-assetName">Asset Name</Label>
                <Input
                  id="emp-assetName"
                  placeholder="e.g. ThinkPad T14 / MacBook Air"
                  value={form.assetName}
                  onChange={(e) => setForm({ ...form, assetName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-assetCode">Asset Code</Label>
                <Input
                  id="emp-assetCode"
                  placeholder="e.g. AST-BBS-001"
                  value={form.assetCode}
                  onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                />
              </div>
            </div>
          </div>

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
