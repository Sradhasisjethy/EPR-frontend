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
import { useOrganizations, useDepartments, useCreateOffice, useUpdateOffice, useCreateDepartment } from '@/hooks/use-organization';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { usePincodeLookup } from '@/hooks/use-pincode';

const emptyForm = {
  organizationId: '',
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
  departmentIds: [],
  status: 'active',
};

export function OfficeFormDialog({ open, onOpenChange, office, defaultOrganizationId = '' }) {
  const isEditing = !!office;
  const [form, setForm] = useState(emptyForm);

  // Typing a six-digit PIN fills city, state and country. All three stay
  // editable — the lookup is a shortcut, not a source of truth, and a PIN the
  // service does not recognise still belongs to a real address.
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
  const [quickDeptOpen, setQuickDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [quickDeptError, setQuickDeptError] = useState('');

  const [deptSearch, setDeptSearch] = useState('');
  const { data: orgData } = useOrganizations({ page: 1, limit: 100 });
  const { data: deptData } = useDepartments({ page: 1, limit: 100 });
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const createDeptMutation = useCreateDepartment();
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
              pincode: office.pincode || '',
              country: office.country || '',
              departmentIds: (office.departments || []).map((d) => d.id),
              status: office.status || 'active',
            }
          : { ...emptyForm, organizationId: defaultOrganizationId || '' }
      );
      setError('');
    }
  }, [open, office, defaultOrganizationId]);

  const handleQuickCreateDepartment = async (e) => {
    e.preventDefault();
    setQuickDeptError('');
    if (!form.organizationId) {
      setQuickDeptError('Please select an Organization first.');
      return;
    }
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      setQuickDeptError('Department Name and Code are required.');
      return;
    }
    try {
      const res = await createDeptMutation.mutateAsync({
        organizationId: form.organizationId,
        name: newDeptName.trim(),
        code: newDeptCode.trim(),
      });
      const newId = res.data?.id || res.id;
      if (newId) {
        setForm((prev) => ({
          ...prev,
          departmentIds: [...prev.departmentIds, newId],
        }));
      }
      setNewDeptName('');
      setNewDeptCode('');
      setQuickDeptOpen(false);
    } catch (err) {
      setQuickDeptError(err.response?.data?.message || 'Failed to create department.');
    }
  };

  const toggleDepartment = (deptId) => {
    setForm((prev) => {
      const exists = prev.departmentIds.includes(deptId);
      return {
        ...prev,
        departmentIds: exists
          ? prev.departmentIds.filter((id) => id !== deptId)
          : [...prev.departmentIds, deptId],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const organizationId = form.organizationId.trim();
    const name = form.name.trim();
    const code = form.code.trim();
    const address = form.address.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const pincode = form.pincode.trim();
    const country = form.country.trim();

    if (!organizationId || !name || !code || !address || !city || !state || !pincode || !country) {
      setError('All fields (Organization, Name, Code, Address, City, State, Pincode, Country) are mandatory.');
      return;
    }

    const payload = {
      organizationId,
      name,
      code,
      address,
      city,
      state,
      pincode,
      country,
      departmentIds: form.departmentIds,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: office.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => { toast.success(isEditing ? 'Office updated' : 'Office created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save office.'));
  };

  const organizations = orgData?.rows || [];
  const departments = deptData?.rows || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Office' : 'New Office'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="office-org">
              Organization <span className="text-destructive font-bold">*</span>
            </Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="office-name">
                Office Name <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="office-name"
                placeholder="e.g. Bhubaneswar HQ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="office-code">
                Office Code <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="office-code"
                placeholder="e.g. BBS-HQ"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-address">
              Address <span className="text-destructive font-bold">*</span>
            </Label>
            <Input
              id="office-address"
              placeholder="e.g. Plot No. 123, Saheed Nagar"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>

          {/* PIN first: it fills city, state and country, so only the street
              address has to be typed by hand. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="office-pincode">
                Pincode / Postal Code <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="office-pincode"
                placeholder="e.g. 751007"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                required
              />
              {pincodeStatus === 'loading' && (
                <p className="text-xs text-muted-foreground">Looking up city and state…</p>
              )}
              {pincodeStatus === 'resolved' && (
                <p className="text-xs text-muted-foreground">City, state and country filled — edit if needed.</p>
              )}
              {pincodeStatus === 'notfound' && (
                <p className="text-xs text-muted-foreground">No match for that PIN code. Enter the city and state below.</p>
              )}
              {pincodeStatus === 'error' && (
                <p className="text-xs text-muted-foreground">PIN lookup unavailable. Enter the city and state below.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="office-city">
                City <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="office-city"
                placeholder="e.g. Bhubaneswar"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="office-state">
                State <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="office-state"
                placeholder="e.g. Odisha"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="office-country">
                Country <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="office-country"
                placeholder="e.g. India"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Departments in this Office</Label>
                {form.departmentIds.length > 0 && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                    {form.departmentIds.length} selected
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickDeptError('');
                  setNewDeptName('');
                  setNewDeptCode('');
                  setQuickDeptOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                <Plus size={13} />
                Add New Department
              </button>
            </div>

            {departments.length > 5 && (
              <Input
                placeholder="Search existing departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="h-7 text-xs bg-background/70"
              />
            )}

            {departments.length === 0 ? (
              <div className="p-3 border border-dashed rounded-md text-xs text-muted-foreground text-center">
                No departments found in the system. Click "Add New Department" above to create one.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2.5 max-h-36 overflow-y-auto border rounded-md bg-muted/20">
                {departments
                  .filter((d) => !deptSearch || d.name.toLowerCase().includes(deptSearch.toLowerCase()) || d.code?.toLowerCase().includes(deptSearch.toLowerCase()))
                  .map((dept) => {
                    const isSelected = form.departmentIds.includes(dept.id);
                    const orgName = dept.Organization?.name || dept.organization?.name;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleDepartment(dept.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <span>{isSelected ? '✓ ' : '+ '}</span>
                        <span>{dept.name}</span>
                        {dept.code && <span className="text-[10px] opacity-75">({dept.code})</span>}
                        {orgName && orgName !== 'Infideep Precast Pvt Ltd' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-muted-foreground/10 opacity-70">
                            {orgName}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
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

    {/* Quick Add Department Modal */}
    <Dialog open={quickDeptOpen} onOpenChange={setQuickDeptOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add New Department</DialogTitle>
        </DialogHeader>

        {quickDeptError && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs font-medium">
            {quickDeptError}
          </div>
        )}

        <form onSubmit={handleQuickCreateDepartment} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="quick-dept-name">Department Name <span className="text-destructive font-bold">*</span></Label>
            <Input
              id="quick-dept-name"
              placeholder="e.g. Sales, Quality, Accounts"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-dept-code">Department Code <span className="text-destructive font-bold">*</span></Label>
            <Input
              id="quick-dept-code"
              placeholder="e.g. SLS, QA, ACC"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setQuickDeptOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={createDeptMutation.isPending}>
              {createDeptMutation.isPending ? 'Adding...' : 'Add Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>
  );
}
