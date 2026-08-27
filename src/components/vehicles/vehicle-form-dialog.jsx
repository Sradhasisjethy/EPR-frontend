import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionError } from '@/components/query-state';
import { useCreateVehicle, useUpdateVehicle } from '@/hooks/use-vehicles';
import { useParties } from '@/hooks/use-parties';

const TYPES = [
  ['TRUCK', 'Truck'],
  ['TIPPER', 'Tipper'],
  ['TRAILER', 'Trailer'],
  ['TRANSIT_MIXER', 'Transit mixer'],
  ['PICKUP', 'Pickup'],
  ['OTHER', 'Other'],
];

const emptyForm = {
  registrationNumber: '', vehicleType: 'TRUCK', capacityTonnes: '',
  ownership: 'OWNED', transporterPartyId: '', driverName: '', driverPhone: '',
  insuranceExpiry: '', fitnessExpiry: '', permitExpiry: '', notes: '',
};

export function VehicleFormDialog({ open, onOpenChange, vehicle }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: partyData } = useParties({ page: 1, limit: 100, partyType: 'VENDOR' });
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const isEdit = Boolean(vehicle);
  const pending = createVehicle.isPending || updateVehicle.isPending;

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      vehicle
        ? {
            ...emptyForm,
            ...Object.fromEntries(
              Object.keys(emptyForm).map((k) => [k, vehicle[k] === null || vehicle[k] === undefined ? '' : String(vehicle[k])])
            ),
          }
        : emptyForm
    );
  }, [open, vehicle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (form.ownership === 'HIRED' && !form.transporterPartyId) {
      setError('A hired vehicle needs the transporter it belongs to, so freight can be billed to them.');
      return;
    }

    // Empty strings would fail uuid/number/date validation server-side, so only
    // send fields the user actually filled in.
    const payload = {
      registrationNumber: form.registrationNumber.trim(),
      vehicleType: form.vehicleType,
      ownership: form.ownership,
      ...(form.capacityTonnes ? { capacityTonnes: Number(form.capacityTonnes) } : {}),
      ...(form.ownership === 'HIRED' ? { transporterPartyId: form.transporterPartyId } : {}),
      ...(form.driverName ? { driverName: form.driverName.trim() } : {}),
      ...(form.driverPhone ? { driverPhone: form.driverPhone.trim() } : {}),
      ...(form.insuranceExpiry ? { insuranceExpiry: form.insuranceExpiry } : {}),
      ...(form.fitnessExpiry ? { fitnessExpiry: form.fitnessExpiry } : {}),
      ...(form.permitExpiry ? { permitExpiry: form.permitExpiry } : {}),
      ...(form.notes ? { notes: form.notes.trim() } : {}),
    };

    const onError = (err) => setError(err.response?.data?.message || 'Could not save the vehicle.');
    const onSuccess = () => onOpenChange(false);

    if (isEdit) updateVehicle.mutate({ id: vehicle.id, ...payload }, { onSuccess, onError });
    else createVehicle.mutate(payload, { onSuccess, onError });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ActionError message={error} onDismiss={() => setError('')} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-reg">Registration number</Label>
              <Input
                id="v-reg"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                placeholder="OD 02 AB 1234"
                required
              />
              <p className="text-xs text-muted-foreground">
                Spacing and hyphens are ignored when checking for duplicates.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-type">Type</Label>
              <select
                id="v-type"
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-cap">Capacity (tonnes)</Label>
              <Input
                id="v-cap"
                type="number"
                step="0.001"
                min="0"
                value={form.capacityTonnes}
                onChange={(e) => setForm({ ...form, capacityTonnes: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-own">Ownership</Label>
              <select
                id="v-own"
                value={form.ownership}
                onChange={(e) => setForm({ ...form, ownership: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="OWNED">Owned</option>
                <option value="HIRED">Hired</option>
              </select>
            </div>
          </div>

          {form.ownership === 'HIRED' && (
            <div className="space-y-1.5">
              <Label htmlFor="v-transporter">Transporter</Label>
              <select
                id="v-transporter"
                value={form.transporterPartyId}
                onChange={(e) => setForm({ ...form, transporterPartyId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="" disabled>Select transporter</option>
                {(partyData?.rows || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-driver">Driver</Label>
              <Input id="v-driver" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-phone">Driver phone</Label>
              <Input id="v-phone" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-ins">Insurance expiry</Label>
              <Input id="v-ins" type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-fit">Fitness expiry</Label>
              <Input id="v-fit" type="date" value={form.fitnessExpiry} onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-permit">Permit expiry</Label>
              <Input id="v-permit" type="date" value={form.permitExpiry} onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-notes">Notes</Label>
            <Input id="v-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add vehicle'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
