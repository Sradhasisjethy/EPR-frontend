import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateParty, useUpdateParty, useUpsertWageProfile } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { toPaise, fromPaise } from '@/lib/money';

// Mirrors GSTIN_PATTERN in backend src/api/parties/parties.schema.js. The API
// is the authority; this only saves a round trip and points at the field.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const emptyForm = {
  partyType: PartyType.CUSTOMER,
  name: '',
  code: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  creditLimitRupees: '',
  creditAgeingDays: '0',
  creditAction: 'NONE',
  dailyWageRupees: '',
  overtimeRateMultiplier: '1.5',
  status: 'active',
};

const PARTY_TYPE_LABELS = {
  [PartyType.CUSTOMER]: 'Customer',
  [PartyType.VENDOR]: 'Vendor',
  [PartyType.CONTRACTOR]: 'Contractor',
  [PartyType.LABOUR]: 'Labour',
  [PartyType.SALES_REF]: 'Sales Reference',
};

export function PartyFormDialog({ open, onOpenChange, party, defaultPartyType }) {
  const isEditing = !!party;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const createMutation = useCreateParty();
  const updateMutation = useUpdateParty();
  const wageMutation = useUpsertWageProfile();
  const isSaving = createMutation.isPending || updateMutation.isPending || wageMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        party
          ? {
              partyType: party.partyType,
              name: party.name || '',
              code: party.code || '',
              gstin: party.gstin || '',
              phone: party.phone || '',
              email: party.email || '',
              address: party.address || '',
              city: party.city || '',
              state: party.state || '',
              creditLimitRupees: fromPaise(party.creditLimitPaise),
              creditAgeingDays: String(party.creditAgeingDays ?? 0),
              creditAction: party.creditAction || 'NONE',
              dailyWageRupees: fromPaise(party.wageProfile?.dailyWagePaise),
              overtimeRateMultiplier: String(party.wageProfile?.overtimeRateMultiplier ?? 1.5),
              status: party.status || 'active',
            }
          : { ...emptyForm, partyType: defaultPartyType || PartyType.CUSTOMER }
      );
      setError('');
    }
  }, [open, party, defaultPartyType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const gstin = form.gstin.trim().toUpperCase();
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      setError('GSTIN must be 15 characters in the standard format, e.g. 21ABCDE1234F1Z5.');
      return;
    }

    const payload = {
      partyType: form.partyType,
      name: form.name,
      code: form.code || undefined,
      gstin: gstin || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      creditLimitPaise: toPaise(form.creditLimitRupees),
      creditAgeingDays: Number(form.creditAgeingDays) || 0,
      creditAction: form.creditAction,
    };

    try {
      const saved = isEditing
        ? await updateMutation.mutateAsync({ id: party.id, ...payload, status: form.status })
        : await createMutation.mutateAsync(payload);

      if (form.partyType === PartyType.LABOUR && form.dailyWageRupees) {
        await wageMutation.mutateAsync({
          partyId: saved.id,
          dailyWagePaise: toPaise(form.dailyWageRupees),
          overtimeRateMultiplier: Number(form.overtimeRateMultiplier) || 1.5,
        });
      }

      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save party.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Party' : 'New Party'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="party-type">Type</Label>
              <select
                id="party-type"
                value={form.partyType}
                onChange={(e) => setForm({ ...form, partyType: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                disabled={isEditing}
              >
                {Object.entries(PARTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party-name">Name</Label>
              <Input id="party-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="party-code">Code</Label>
            <Input
              id="party-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Optional — must be unique across all parties"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="party-phone">Phone</Label>
              <Input id="party-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party-email">Email</Label>
              <Input id="party-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          {form.partyType !== PartyType.LABOUR && (
            <div className="space-y-1.5">
              <Label htmlFor="party-gstin">GSTIN</Label>
              <Input
                id="party-gstin"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="21ABCDE1234F1Z5"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Drives the GST place of supply and the filed returns — one per party of each type.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="party-address">Address</Label>
            <Input id="party-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="party-city">City</Label>
              <Input id="party-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party-state">State</Label>
              <Input id="party-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>

          {form.partyType === PartyType.CUSTOMER && (
            <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1.5">
                <Label htmlFor="party-credit-limit">Credit Limit (₹)</Label>
                <Input id="party-credit-limit" type="number" step="0.01" value={form.creditLimitRupees} onChange={(e) => setForm({ ...form, creditLimitRupees: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-ageing">Ageing (days)</Label>
                <Input id="party-ageing" type="number" value={form.creditAgeingDays} onChange={(e) => setForm({ ...form, creditAgeingDays: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-credit-action">On Breach</Label>
                <select
                  id="party-credit-action"
                  value={form.creditAction}
                  onChange={(e) => setForm({ ...form, creditAction: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="NONE">None</option>
                  <option value="WARN">Warn</option>
                  <option value="BLOCK">Block</option>
                </select>
              </div>
              <p className="col-span-3 text-xs text-muted-foreground">BR-13: exceeding credit limit or overdue ageing blocks/warns on new orders.</p>
            </div>
          )}

          {form.partyType === PartyType.LABOUR && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1.5">
                <Label htmlFor="party-wage">Daily Wage (₹)</Label>
                <Input id="party-wage" type="number" step="0.01" value={form.dailyWageRupees} onChange={(e) => setForm({ ...form, dailyWageRupees: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-ot">Overtime Multiplier</Label>
                <Input id="party-ot" type="number" step="0.1" min="1" value={form.overtimeRateMultiplier} onChange={(e) => setForm({ ...form, overtimeRateMultiplier: e.target.value })} />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">BR-24: wage accrues per attendance day at this rate.</p>
            </div>
          )}

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="party-status">Status</Label>
              <select
                id="party-status"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Party'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
