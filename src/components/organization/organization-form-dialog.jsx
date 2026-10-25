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
import { apiClient } from '@/lib/api-client';
import { GST_STATES, stateByCode } from '@/constants/gst-states';
import { Building2, Landmark, MapPin, Phone, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

// The same statutory formats the API enforces (organization.schema.js) —
// checked here too so the user hears about a bad PAN beside the field, not as
// a 400 after submit.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CODE_REGEX = /^[A-Za-z0-9_-]{2,15}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const CIN_REGEX = /^[ULF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
const PIN_REGEX = /^[1-9][0-9]{5}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_ACCOUNT_REGEX = /^[0-9]{9,18}$/;
const PHONE_REGEX = /^(?:\+91[-\s]?)?[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  name: '',
  tradeName: '',
  code: '',
  gstin: '',
  pan: '',
  cin: '',
  udyam: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateCode: '',
  pinCode: '',
  email: '',
  phone: '',
  baseCurrency: 'INR',
  fiscalYearStart: 'APRIL',
  bankName: '',
  bankBranch: '',
  bankAccountNumber: '',
  bankIfsc: '',
  logo: '',
  description: '',
  status: 'active',
};

const SectionTitle = ({ icon: Icon, children }) => (
  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
    <Icon size={13} /> {children}
  </p>
);

const Req = () => <span className="text-destructive font-bold">*</span>;

export function OrganizationFormDialog({ open, onOpenChange, organization }) {
  const isEditing = !!organization;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        organization
          ? {
              ...emptyForm,
              name: organization.name || '',
              tradeName: organization.tradeName || '',
              code: organization.code || '',
              gstin: organization.gstin || '',
              pan: organization.pan || '',
              cin: organization.cin || '',
              udyam: organization.udyam || '',
              addressLine1: organization.addressLine1 || '',
              addressLine2: organization.addressLine2 || '',
              city: organization.city || '',
              stateCode: organization.stateCode || '',
              pinCode: organization.pinCode || '',
              email: organization.email || '',
              phone: organization.phone || '',
              baseCurrency: organization.baseCurrency || 'INR',
              fiscalYearStart: organization.fiscalYearStart || 'APRIL',
              bankName: organization.bankName || '',
              bankBranch: organization.bankBranch || '',
              bankAccountNumber: organization.bankAccountNumber || '',
              bankIfsc: organization.bankIfsc || '',
              logo: organization.logo || '',
              description: organization.description || '',
              status: organization.status || 'active',
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, organization]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setUpper = (key, max) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, max) }));

  /**
   * The GSTIN embeds the state code (chars 1-2) and the PAN (chars 3-12), so
   * a valid GSTIN fills both. Only empty fields are filled — a deliberate
   * correction by the user is never overwritten.
   */
  const handleGstinChange = (e) => {
    const gstin = e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 15);
    setForm((f) => ({
      ...f,
      gstin,
      ...(GSTIN_REGEX.test(gstin)
        ? {
            pan: f.pan || gstin.slice(2, 12),
            stateCode: f.stateCode || (stateByCode(gstin.slice(0, 2)) ? gstin.slice(0, 2) : f.stateCode),
          }
        : {}),
    }));
  };

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(`Logo exceeds the 2 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setError('');
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await apiClient.post('/organizations/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url || res.data?.url;
      setForm((f) => ({ ...f, logo: url }));
    } catch (err) {
      // No data: URL fallback — the server only accepts logo paths it issued,
      // and a file it just refused must not reach the record by another route.
      toast.error(err.response?.data?.message || 'Could not upload the logo. Please try another image.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const firstProblem = () => {
    const f = form;
    if (!f.name.trim() || f.name.trim().length < 2) return 'Legal name must be at least 2 characters.';
    if (!CODE_REGEX.test(f.code.trim())) return 'Code must be 2-15 alphanumeric characters without spaces (e.g. ACS).';
    if (!GSTIN_REGEX.test(f.gstin)) return 'GSTIN must be 15 characters, e.g. 21ABCDE1234F1Z5.';
    if (f.pan && !PAN_REGEX.test(f.pan)) return 'PAN must be 10 characters, e.g. ABCDE1234F.';
    if (f.pan && f.gstin.slice(2, 12) !== f.pan) return `PAN ${f.pan} does not match the one embedded in the GSTIN (${f.gstin.slice(2, 12)}).`;
    if (f.cin && !CIN_REGEX.test(f.cin)) return 'CIN must be 21 characters, e.g. U12345OD2020PTC123456.';
    if (f.udyam && !UDYAM_REGEX.test(f.udyam)) return 'Udyam number must look like UDYAM-OD-01-1234567.';
    if (!f.addressLine1.trim()) return 'Address line 1 is required.';
    if (!f.city.trim()) return 'City / District is required.';
    if (!f.stateCode) return 'State is required.';
    if (f.gstin.slice(0, 2) !== f.stateCode) {
      const s = stateByCode(f.stateCode);
      return `The GSTIN starts with ${f.gstin.slice(0, 2)}, which is not ${s?.name || 'the selected state'} (${f.stateCode}).`;
    }
    if (!PIN_REGEX.test(f.pinCode)) return 'PIN code must be 6 digits — it is required for e-Way Bill distance calculation.';
    if (!EMAIL_REGEX.test(f.email.trim())) return 'Enter a valid official contact email.';
    if (!PHONE_REGEX.test(f.phone.trim())) return 'Phone must be a 10-digit Indian number, with or without +91.';
    if (!/^[A-Z]{3}$/.test(f.baseCurrency)) return 'Base currency must be a 3-letter ISO code, e.g. INR.';
    const bank = [f.bankName, f.bankBranch, f.bankAccountNumber, f.bankIfsc].filter((v) => v.trim());
    if (bank.length > 0 && bank.length < 4) return 'Bank details are optional, but once started all four fields (bank, branch, account number, IFSC) are needed for invoice templates.';
    if (f.bankAccountNumber && !BANK_ACCOUNT_REGEX.test(f.bankAccountNumber)) return 'Account number must be 9-18 digits.';
    if (f.bankIfsc && !IFSC_REGEX.test(f.bankIfsc)) return 'IFSC must be 11 characters, e.g. SBIN0001234.';
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const problem = firstProblem();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');

    const f = form;
    const selectedState = stateByCode(f.stateCode);
    const payload = {
      name: f.name.trim(),
      tradeName: f.tradeName.trim() || null,
      code: f.code.trim().toUpperCase(),
      gstin: f.gstin,
      pan: f.pan || null,
      cin: f.cin || null,
      udyam: f.udyam || null,
      addressLine1: f.addressLine1.trim(),
      addressLine2: f.addressLine2.trim() || null,
      city: f.city.trim(),
      state: selectedState?.name || null,
      stateCode: f.stateCode,
      pinCode: f.pinCode,
      email: f.email.trim().toLowerCase(),
      phone: f.phone.trim(),
      baseCurrency: f.baseCurrency,
      fiscalYearStart: f.fiscalYearStart,
      bankName: f.bankName.trim() || null,
      bankBranch: f.bankBranch.trim() || null,
      bankAccountNumber: f.bankAccountNumber || null,
      bankIfsc: f.bankIfsc || null,
      logo: f.logo || null,
      description: f.description?.trim() || undefined,
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
      {/* Same shell as the party form: near-full-width, fixed header and
          footer, the body scrolls only if it must. Wide rows (sm:grid-cols-4)
          keep the form short instead of tall. */}
      <DialogContent className="w-[96vw] max-w-5xl max-h-[calc(100dvh-24px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-3 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-lg font-bold">{isEditing ? 'Edit Organization' : 'New Organization'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium shrink-0">
            {error}
          </div>
        )}

        <form id="organization-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {/* ------------------------------------------------ identity ---- */}
          <SectionTitle icon={Building2}>Company Identity</SectionTitle>

          {/* Logo rides at the top beside the identity fields, the way a
              profile screen leads with the picture — it is the face of every
              GST invoice, challan, BOM and PO this org prints. */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex sm:flex-col items-center gap-2 shrink-0 sm:w-28">
              {form.logo ? (
                <div className="relative shrink-0">
                  <img src={form.logo} alt="Company logo" className="h-20 w-20 rounded-lg border border-border object-contain bg-white/80 p-1" />
                  <button
                    type="button"
                    aria-label="Remove logo"
                    onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <Upload size={20} />
                </div>
              )}
              {/* A label wrapping the hidden input, not a ref-click — the
                  same native pattern the employee photo upload uses, so the
                  picker opens without any JS in the path. */}
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent text-xs font-medium cursor-pointer shadow-sm transition-colors">
                <Upload size={14} className="text-primary" />
                <span>{isUploadingLogo ? 'Uploading…' : form.logo ? 'Change Logo' : 'Upload Logo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload logo"
                  className="hidden"
                  disabled={isUploadingLogo}
                  onChange={handleLogoSelect}
                />
              </label>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="org-name">Legal Name (as per GST) <Req /></Label>
                  <Input id="org-name" placeholder="e.g. Infideep Precast Pvt Ltd" value={form.name} onChange={set('name')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-trade-name">Trade Name</Label>
                  <Input id="org-trade-name" placeholder="If it differs" value={form.tradeName} onChange={set('tradeName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-code">Code <Req /></Label>
                  <Input id="org-code" placeholder="e.g. IFP" maxLength={15} value={form.code} onChange={setUpper('code', 15)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-gstin">GSTIN <Req /></Label>
                  <Input id="org-gstin" placeholder="21ABCDE1234F1Z5" maxLength={15} value={form.gstin} onChange={handleGstinChange} required className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-pan">PAN</Label>
                  <Input id="org-pan" placeholder="ABCDE1234F" maxLength={10} value={form.pan} onChange={setUpper('pan', 10)} className="font-mono" />
                  <p className="text-[10px] text-muted-foreground">Filled from the GSTIN.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-cin">CIN</Label>
                  <Input id="org-cin" placeholder="U12345OD2020PTC123456" maxLength={21} value={form.cin} onChange={setUpper('cin', 21)} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-udyam">MSME / Udyam No.</Label>
                  <Input id="org-udyam" placeholder="UDYAM-OD-01-1234567" maxLength={19} value={form.udyam} onChange={(e) => setForm((f) => ({ ...f, udyam: e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 19) }))} className="font-mono" />
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------- registered address ---- */}
          <SectionTitle icon={MapPin}>Registered Address</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-addr1">Address Line 1 <Req /></Label>
              <Input id="org-addr1" placeholder="Plot / building, street" value={form.addressLine1} onChange={set('addressLine1')} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-addr2">Address Line 2</Label>
              <Input id="org-addr2" placeholder="Area, landmark (optional)" value={form.addressLine2} onChange={set('addressLine2')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-city">City / District <Req /></Label>
              <Input id="org-city" placeholder="e.g. Bhubaneswar" value={form.city} onChange={set('city')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-state">State <Req /></Label>
              <select
                id="org-state"
                value={form.stateCode}
                onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="" disabled>Select state</option>
                {GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-pin">PIN Code <Req /></Label>
              <Input id="org-pin" placeholder="751024" maxLength={6} inputMode="numeric" value={form.pinCode} onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} required />
              <p className="text-[10px] text-muted-foreground">Feeds e-Way Bill distance (NIC).</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email">Official Email <Req /></Label>
              <Input id="org-email" type="email" placeholder="accounts@company.in" value={form.email} onChange={set('email')} required />
            </div>
          </div>

          {/* --------------------------------------- contact & finance ---- */}
          <SectionTitle icon={Phone}>Contact & Finance</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Official Phone <Req /></Label>
              <Input id="org-phone" type="tel" placeholder="+91 9437000000" value={form.phone} onChange={set('phone')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-currency">Base Currency</Label>
              <Input id="org-currency" maxLength={3} value={form.baseCurrency} onChange={setUpper('baseCurrency', 3)} className="font-mono" />
              <p className="text-[10px] text-muted-foreground">INR default; any ISO code for import/export.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-fy">Financial Year Cycle</Label>
              <select
                id="org-fy"
                value={form.fiscalYearStart}
                onChange={set('fiscalYearStart')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="APRIL">April – March (Indian fiscal year)</option>
                <option value="JANUARY">January – December (calendar year)</option>
              </select>
            </div>
          </div>

          {/* --------------------------------------------------- bank ---- */}
          <SectionTitle icon={Landmark}>Default Bank Account <span className="normal-case font-normal">— optional now; invoice templates print it</span></SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-bank-name">Bank Name</Label>
              <Input id="org-bank-name" placeholder="e.g. State Bank of India" value={form.bankName} onChange={set('bankName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-bank-branch">Branch</Label>
              <Input id="org-bank-branch" placeholder="e.g. Chandrasekharpur" value={form.bankBranch} onChange={set('bankBranch')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-bank-account">Account Number</Label>
              <Input id="org-bank-account" placeholder="9-18 digits" maxLength={18} inputMode="numeric" value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 18) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-bank-ifsc">IFSC Code</Label>
              <Input id="org-bank-ifsc" placeholder="SBIN0001234" maxLength={11} value={form.bankIfsc} onChange={setUpper('bankIfsc', 11)} className="font-mono" />
            </div>
          </div>

          {/* -------------------------------------------------- notes ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
            <div className={`space-y-1.5 ${isEditing ? 'sm:col-span-3' : 'sm:col-span-4'}`}>
              <Label htmlFor="org-description">Description</Label>
              <Input id="org-description" placeholder="Optional description" value={form.description} onChange={set('description')} />
            </div>
            {isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="org-status">Status</Label>
                <select
                  id="org-status"
                  value={form.status}
                  onChange={set('status')}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="organization-form" disabled={isSaving || isUploadingLogo}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
