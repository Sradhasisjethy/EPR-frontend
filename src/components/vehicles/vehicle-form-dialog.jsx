import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionError } from '@/components/query-state';
import { useCreateVehicle, useUpdateVehicle } from '@/hooks/use-vehicles';
import { useParties } from '@/hooks/use-parties';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { toInput } from '@/lib/decimal';

const TYPES = [
  ['TRUCK', 'Truck (General Cargo)'],
  ['TIPPER', 'Tipper / Dumper'],
  ['TRAILER', 'Trailer (Flatbed / Lowbed)'],
  ['TRANSIT_MIXER', 'Transit Mixer (RMC)'],
  ['PICKUP', 'Pickup / Light Commercial'],
  ['OTHER', 'Other / Specialized'],
];

const BODY_CONFIGURATIONS = [
  'Tipper / Dumper (Aggregates & Sand)',
  'Trailer / Flatbed (Precast Slabs & Poles)',
  'Transit Mixer (Ready-Mix Concrete)',
  'Hyva / Heavy Multi-Axle Tipper',
  'Tractor Trailer (Internal Plant / Mine Haulage)',
  'Open High-Side Body (General Freight)',
  'Closed Container / Box Body',
  'Bulk Cement Bulker / Tanker',
  'Other Body Type',
];

const OWNERSHIP_OPTIONS = [
  ['OWNED', 'Owned (Company Fleet)'],
  ['HIRED', 'Hired (Dedicated Contract)'],
  ['MARKET', 'Market (Spot / Trip Basis)'],
  ['ATTACHED', 'Attached / Associated Carrier'],
];

const emptyForm = {
  registrationNumber: '',
  vehicleType: 'TRUCK',
  bodyConfiguration: 'Tipper / Dumper (Aggregates & Sand)',
  capacityTonnes: '',
  tareWeightTonnes: '',
  grossVehicleWeightTonnes: '',
  ownership: 'OWNED',
  transporterPartyId: '',
  driverName: '',
  driverPhone: '',
  driverLicenseNumber: '',
  insuranceExpiry: '',
  fitnessExpiry: '',
  permitExpiry: '',
  puccExpiry: '',
  fastagNumber: '',
  gpsDeviceId: '',
  status: 'active',
  blacklistReason: '',
  notes: '',
};

export function VehicleFormDialog({ open, onOpenChange, vehicle }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Fetch vendors/transporters for Carrier linkage
  const { data: partyData } = useParties({ page: 1, limit: 100, partyType: 'VENDOR' }, { enabled: open });
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
            registrationNumber: vehicle.registrationNumber || '',
            vehicleType: vehicle.vehicleType || 'TRUCK',
            bodyConfiguration: vehicle.bodyConfiguration || 'Tipper / Dumper (Aggregates & Sand)',
            capacityTonnes: toInput(vehicle.capacityTonnes),
            tareWeightTonnes: toInput(vehicle.tareWeightTonnes),
            grossVehicleWeightTonnes: toInput(vehicle.grossVehicleWeightTonnes),
            ownership: vehicle.ownership || 'OWNED',
            transporterPartyId: vehicle.transporterPartyId || '',
            driverName: vehicle.driverName || '',
            driverPhone: vehicle.driverPhone || '',
            driverLicenseNumber: vehicle.driverLicenseNumber || '',
            insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.slice(0, 10) : '',
            fitnessExpiry: vehicle.fitnessExpiry ? vehicle.fitnessExpiry.slice(0, 10) : '',
            permitExpiry: vehicle.permitExpiry ? vehicle.permitExpiry.slice(0, 10) : '',
            puccExpiry: vehicle.puccExpiry ? vehicle.puccExpiry.slice(0, 10) : '',
            fastagNumber: vehicle.fastagNumber || '',
            gpsDeviceId: vehicle.gpsDeviceId || '',
            status: vehicle.status || 'active',
            blacklistReason: vehicle.blacklistReason || '',
            notes: vehicle.notes || '',
          }
        : emptyForm
    );
  }, [open, vehicle]);

  const isNonOwned = form.ownership !== 'OWNED';
  const tareNum = Number(form.tareWeightTonnes) || 0;
  const gvwNum = Number(form.grossVehicleWeightTonnes) || 0;
  const calculatedPayload = gvwNum > tareNum ? (gvwNum - tareNum).toFixed(3) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isNonOwned && !form.transporterPartyId) {
      setError('Please select the registered Transporter / Carrier party for hired/market vehicles (required for e-Way bill Part-B).');
      return;
    }

    if (gvwNum > 0 && tareNum > 0 && gvwNum <= tareNum) {
      setError('Gross Vehicle Weight (GVW) must be greater than Tare (Unladen) Weight.');
      return;
    }

    if (form.status === 'blacklisted' && !form.blacklistReason?.trim()) {
      setError('A reason is mandatory when marking a vehicle as Blacklisted / Blocked.');
      return;
    }

    const payload = {
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      vehicleType: form.vehicleType,
      bodyConfiguration: form.bodyConfiguration || undefined,
      ownership: form.ownership,
      transporterPartyId: isNonOwned ? form.transporterPartyId || null : null,
      capacityTonnes: form.capacityTonnes ? Number(form.capacityTonnes) : (calculatedPayload ? Number(calculatedPayload) : undefined),
      tareWeightTonnes: form.tareWeightTonnes ? Number(form.tareWeightTonnes) : undefined,
      grossVehicleWeightTonnes: form.grossVehicleWeightTonnes ? Number(form.grossVehicleWeightTonnes) : undefined,
      driverName: form.driverName.trim() || undefined,
      driverPhone: form.driverPhone.trim() || undefined,
      driverLicenseNumber: form.driverLicenseNumber.trim() || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      fitnessExpiry: form.fitnessExpiry || undefined,
      permitExpiry: form.permitExpiry || undefined,
      puccExpiry: form.puccExpiry || undefined,
      fastagNumber: form.fastagNumber.trim() || undefined,
      gpsDeviceId: form.gpsDeviceId.trim() || undefined,
      status: form.status,
      blacklistReason: form.status === 'blacklisted' ? form.blacklistReason.trim() : undefined,
      notes: form.notes.trim() || undefined,
    };

    const onError = (err) => setError(err.response?.data?.message || 'Could not save the vehicle.');
    const onSuccess = () => onOpenChange(false);

    if (isEdit) updateVehicle.mutate({ id: vehicle.id, ...payload }, { onSuccess, onError });
    else createVehicle.mutate(payload, { onSuccess, onError });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-3 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-xl font-bold">
            {isEdit ? `Edit Vehicle: ${form.registrationNumber || 'Master'}` : 'New Fleet Vehicle & Carrier Master'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        <form id="vehicle-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          {/* BLACKLIST WARNING BANNER IF VEHICLE IS BLOCKED */}
          {form.status === 'blacklisted' && (
            <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert size={18} />
                <span>VEHICLE BLACKLISTED / BLOCKED</span>
              </div>
              <p className="text-xs">
                This vehicle is blocked from gate entry weighbridge slips and Delivery Challans. Ensure reason is documented below.
              </p>
            </div>
          )}

          {/* CARD 1: VEHICLE IDENTITY & OWNERSHIP LINKAGE */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>🚛</span> Vehicle Identity & Carrier Assignment
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="v-reg">
                  Registration Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="v-reg"
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. OD 02 AB 1234"
                  required
                  className="font-mono font-bold tracking-wider"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="v-type">Vehicle Class</Label>
                <select
                  id="v-type"
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                >
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="v-body">Body Configuration / Sub-Type</Label>
                <select
                  id="v-body"
                  value={form.bodyConfiguration}
                  onChange={(e) => setForm({ ...form, bodyConfiguration: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                >
                  {BODY_CONFIGURATIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border/40">
              <div className="space-y-1.5">
                <Label htmlFor="v-own">Ownership Category</Label>
                <select
                  id="v-own"
                  value={form.ownership}
                  onChange={(e) => setForm({ ...form, ownership: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                >
                  {OWNERSHIP_OPTIONS.map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>

              {isNonOwned ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="v-transporter">
                      Transporter / Carrier Party <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-primary font-semibold">e-Way Bill Part-B</span>
                  </div>
                  <select
                    id="v-transporter"
                    value={form.transporterPartyId}
                    onChange={(e) => setForm({ ...form, transporterPartyId: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required
                  >
                    <option value="" disabled>Select registered Transporter / Vendor</option>
                    {(partyData?.rows || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.gstin ? `[GSTIN: ${p.gstin}]` : '[Unregistered]'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5 flex flex-col justify-end">
                  <p className="text-xs text-muted-foreground pb-1">
                    Company-owned vehicle. Freight is treated as internal logistics with no third-party transporter billing.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: WEIGHBRIDGE TARE WEIGHT & GVW PAYLOAD CAPACITY */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span>⚖️</span> Weighbridge Slip & Overloading Weights (Tonnes)
              </h4>
              {calculatedPayload && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Legal Max Net Payload: {calculatedPayload} Tonnes
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-tare">Tare / Unladen Weight (t)</Label>
                  <span className="text-[10px] text-muted-foreground">Empty Vehicle</span>
                </div>
                <Input
                  id="v-tare"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.tareWeightTonnes}
                  onChange={(e) => setForm({ ...form, tareWeightTonnes: e.target.value })}
                  placeholder="e.g. 9.850 (Empty wt)"
                  className="font-medium"
                />
                <p className="text-[10px] text-muted-foreground">Baseline empty tare recorded during gate weigh-in.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-gvw">Gross Vehicle Weight (GVW) (t)</Label>
                  <span className="text-[10px] text-muted-foreground">RC Book Max</span>
                </div>
                <Input
                  id="v-gvw"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.grossVehicleWeightTonnes}
                  onChange={(e) => setForm({ ...form, grossVehicleWeightTonnes: e.target.value })}
                  placeholder="e.g. 28.000 (Gross wt)"
                  className="font-medium"
                />
                <p className="text-[10px] text-muted-foreground">Maximum legal laden weight to prevent RTO penalties.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-cap">Rated Payload Capacity (t)</Label>
                  <span className="text-[10px] text-muted-foreground">Order Dispatch</span>
                </div>
                <Input
                  id="v-cap"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.capacityTonnes || calculatedPayload || ''}
                  onChange={(e) => setForm({ ...form, capacityTonnes: e.target.value })}
                  placeholder={calculatedPayload || 'e.g. 18.150'}
                  className="font-medium"
                />
                <p className="text-[10px] text-muted-foreground">Default payload used to suggest truck counts on orders.</p>
              </div>
            </div>
          </div>

          {/* CARD 3: STATUTORY COMPLIANCE & EXPIRED PAPERS (INDIA RTO) */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>📋</span> Statutory RTO Compliance Expiries
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="v-ins">Insurance Expiry Date</Label>
                <Input
                  id="v-ins"
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-fit">Fitness Expiry Date</Label>
                <Input
                  id="v-fit"
                  type="date"
                  value={form.fitnessExpiry}
                  onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-permit">Permit Expiry Date</Label>
                <Input
                  id="v-permit"
                  type="date"
                  value={form.permitExpiry}
                  onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-pucc">PUCC (Pollution) Expiry</Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">Mandatory</span>
                </div>
                <Input
                  id="v-pucc"
                  type="date"
                  value={form.puccExpiry}
                  onChange={(e) => setForm({ ...form, puccExpiry: e.target.value })}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Vehicles with expired statutory papers will trigger compliance alerts and may be restricted from automated gate passes.
            </p>
          </div>

          {/* CARD 4: DRIVER DETAILS, FASTAG & TELEMATICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Driver Information */}
            <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                <span>👤</span> Driver Information & Gate Pass
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="v-driver" className="text-xs font-medium">Default Driver Name</Label>
                  <Input
                    id="v-driver"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    placeholder="Driver Full Name"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="v-phone" className="text-xs font-medium">Driver Mobile / Phone</Label>
                  <Input
                    id="v-phone"
                    value={form.driverPhone}
                    onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-dl" className="text-xs font-medium">Driver License (DL) Number</Label>
                  <span className="text-[10px] text-muted-foreground">Transit Insurance Audit</span>
                </div>
                <Input
                  id="v-dl"
                  value={form.driverLicenseNumber}
                  onChange={(e) => setForm({ ...form, driverLicenseNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. OD0220180012345"
                  className="h-8 text-xs uppercase"
                />
              </div>
            </div>

            {/* Right: FASTag & GPS Telematics */}
            <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                <span>📡</span> FASTag & Telematics Tracking
              </h4>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-fastag" className="text-xs font-medium">FASTag Barcode / RFID ID</Label>
                  <span className="text-[10px] text-muted-foreground">Boom Barrier Entry</span>
                </div>
                <Input
                  id="v-fastag"
                  value={form.fastagNumber}
                  onChange={(e) => setForm({ ...form, fastagNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. 34161FA8203204958"
                  className="h-8 text-xs uppercase font-mono"
                />
              </div>

              <div className="space-y-1 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label htmlFor="v-gps" className="text-xs font-medium">GPS Device ID / Tracker IMEI</Label>
                  <span className="text-[10px] text-muted-foreground">Live Transit Telematics</span>
                </div>
                <Input
                  id="v-gps"
                  value={form.gpsDeviceId}
                  onChange={(e) => setForm({ ...form, gpsDeviceId: e.target.value })}
                  placeholder="e.g. 864502049182345"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* CARD 5: OPERATIONAL STATUS & BLACKLIST CONTROLS */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>🛡️</span> Fleet Status & Operating Notes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="v-status">Fleet Status</Label>
                <select
                  id="v-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                >
                  <option value="active">Active (Available for Dispatch)</option>
                  <option value="maintenance">Under Maintenance / Garage</option>
                  <option value="blacklisted">Blacklisted / Blocked</option>
                  <option value="inactive">Inactive / Decommissioned</option>
                </select>
              </div>

              <div className={`space-y-1.5 ${form.status === 'blacklisted' ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
                {form.status === 'blacklisted' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="v-blacklist-reason" className="text-destructive font-bold">
                      Blacklist / Blocking Reason <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="v-blacklist-reason"
                      value={form.blacklistReason}
                      onChange={(e) => setForm({ ...form, blacklistReason: e.target.value })}
                      placeholder="e.g. Repeated gross overloading violations, transit theft, fake papers"
                      required
                      className="border-destructive focus-visible:ring-destructive"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="v-notes">General Notes / Remarks</Label>
                    <Input
                      id="v-notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g. Regular driver assigned, rear tyres replaced Aug 2026"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="vehicle-form" disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
