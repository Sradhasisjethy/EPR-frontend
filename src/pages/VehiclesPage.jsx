import { useState } from 'react';
import { Plus, Pencil, Ban, TriangleAlert } from 'lucide-react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QueryState, ActionError } from '@/components/query-state';
import { useVehicles, useDeleteVehicle } from '@/hooks/use-vehicles';
import { VehicleFormDialog } from '@/components/vehicles/vehicle-form-dialog';

const TYPE_LABEL = {
  TRUCK: 'Truck',
  TIPPER: 'Tipper',
  TRAILER: 'Trailer',
  TRANSIT_MIXER: 'Transit mixer',
  PICKUP: 'Pickup',
  OTHER: 'Other',
};

/** Days until a compliance date, or null when it was never recorded. */
const daysUntil = (date) => {
  if (!date) return null;
  const diff = new Date(date).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
};

/** Soonest expiry across insurance, fitness, permit and PUCC. */
const soonestExpiry = (vehicle) => {
  const entries = [
    ['Insurance', vehicle.insuranceExpiry],
    ['Fitness', vehicle.fitnessExpiry],
    ['Permit', vehicle.permitExpiry],
    ['PUCC', vehicle.puccExpiry],
  ]
    .map(([label, date]) => ({ label, date, days: daysUntil(date) }))
    .filter((e) => e.days !== null);

  if (!entries.length) return null;
  return entries.reduce((worst, e) => (e.days < worst.days ? e : worst));
};

export default function VehiclesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [error, setError] = useState('');

  const vehicleQuery = usePaginated(useVehicles, {}, { sortableColumns: ['registrationNumber', 'vehicleType', 'ownership', 'status'] });
  const deleteVehicle = useDeleteVehicle();

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (vehicle) => {
    setEditing(vehicle);
    setDialogOpen(true);
  };

  const confirmDeactivate = () => {
    setError('');
    deleteVehicle.mutate(deactivating.id, {
      onSuccess: () => setDeactivating(null),
      onError: (err) => {
        setError(err.response?.data?.message || 'Could not deactivate the vehicle.');
        setDeactivating(null);
      },
    });
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          
          <p className="text-sm text-muted-foreground">
            The fleet behind the vehicle number on a challan, so the same lorry is spelt one way everywhere.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} className="mr-2" /> Add Vehicle
        </Button>
      </div>

      <ActionError message={error} onDismiss={() => setError('')} />

      <QueryState query={vehicleQuery.query} label="vehicles">
        <DataTable
          columns={[
            {
              accessorKey: 'registrationNumber',
              header: 'Registration & Class',
              cell: ({ row }) => (
                <div className="space-y-0.5">
                  <span className="font-mono font-bold block">{row.original.registrationNumber}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted">
                      {TYPE_LABEL[row.original.vehicleType] || row.original.vehicleType}
                    </span>
                    {row.original.bodyConfiguration && (
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]" title={row.original.bodyConfiguration}>
                        {row.original.bodyConfiguration.split('(')[0]}
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              id: 'weights',
              header: 'Tare / GVW / Payload',
              cell: ({ row }) => {
                const tare = row.original.tareWeightTonnes ? `${Number(row.original.tareWeightTonnes)}t` : '—';
                const gvw = row.original.grossVehicleWeightTonnes ? `${Number(row.original.grossVehicleWeightTonnes)}t` : '—';
                const cap = row.original.capacityTonnes ? `${Number(row.original.capacityTonnes)}t` : '—';
                return (
                  <div className="text-xs space-y-0.5 font-mono">
                    <div className="text-muted-foreground text-[11px]">Tare: <span className="font-medium text-foreground">{tare}</span> | GVW: <span className="font-medium text-foreground">{gvw}</span></div>
                    <div className="text-primary font-bold">Payload: {cap}</div>
                  </div>
                );
              },
            },
            {
              id: 'ownership',
              header: 'Ownership / Carrier',
              cell: ({ row }) => (
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold block">
                    {row.original.ownership === 'OWNED' ? 'Owned Fleet' : row.original.ownership}
                  </span>
                  {row.original.transporter && (
                    <span className="text-[11px] text-muted-foreground block truncate max-w-[160px]" title={row.original.transporter.name}>
                      {row.original.transporter.name}
                    </span>
                  )}
                </div>
              ),
            },
            {
              id: 'driver',
              header: 'Driver & DL',
              cell: ({ row }) => (
                <div className="space-y-0.5 text-xs">
                  <span className="font-medium block">{row.original.driverName || '—'}</span>
                  {row.original.driverPhone && <span className="text-muted-foreground block">{row.original.driverPhone}</span>}
                  {row.original.driverLicenseNumber && (
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">DL: {row.original.driverLicenseNumber}</span>
                  )}
                </div>
              ),
            },
            {
              id: 'telematics',
              header: 'FASTag / GPS',
              cell: ({ row }) => {
                if (!row.original.fastagNumber && !row.original.gpsDeviceId) return <span className="text-muted-foreground text-xs">—</span>;
                return (
                  <div className="text-[11px] font-mono space-y-0.5">
                    {row.original.fastagNumber && <div className="truncate max-w-[120px]" title={`FASTag: ${row.original.fastagNumber}`}>Tag: {row.original.fastagNumber}</div>}
                    {row.original.gpsDeviceId && <div className="text-muted-foreground truncate max-w-[120px]" title={`GPS: ${row.original.gpsDeviceId}`}>GPS: {row.original.gpsDeviceId}</div>}
                  </div>
                );
              },
            },
            {
              id: 'compliance',
              header: 'Papers & PUCC',
              cell: ({ row }) => {
                const worst = soonestExpiry(row.original);
                if (!worst) return <span className="text-muted-foreground text-xs">—</span>;
                if (worst.days < 0) {
                  return (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">
                      <TriangleAlert size={13} aria-hidden="true" />
                      {worst.label} expired
                    </span>
                  );
                }
                if (worst.days <= 30) {
                  return (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                      <TriangleAlert size={13} aria-hidden="true" />
                      {worst.label} in {worst.days}d
                    </span>
                  );
                }
                return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">Valid</span>;
              },
            },
            {
              accessorKey: 'status',
              header: 'Status',
              cell: ({ row }) => {
                if (row.original.status === 'blacklisted') {
                  return (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                        Blocked
                      </span>
                      {row.original.blacklistReason && (
                        <span className="text-[10px] text-destructive block truncate max-w-[120px]" title={row.original.blacklistReason}>
                          {row.original.blacklistReason}
                        </span>
                      )}
                    </div>
                  );
                }
                if (row.original.status === 'maintenance') {
                  return (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                      Maintenance
                    </span>
                  );
                }
                return <StatusBadge status={row.original.status} />;
              },
            },
            {
              id: 'actions',
              header: '',
              cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                  <button
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(row.original)}
                    title="Edit vehicle"
                  >
                    <Pencil size={15} />
                  </button>
                  {row.original.status === 'active' && (
                    <button
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeactivating(row.original)}
                      title="Deactivate vehicle"
                    >
                      <Ban size={15} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          {...vehicleQuery.tableProps}
          searchPlaceholder="Search registration or driver…"
          emptyMessage="No vehicles yet. Add the lorries you dispatch with so challans stop being typed by hand."
        />
      </QueryState>

      <VehicleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} vehicle={editing} />

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(v) => !v && setDeactivating(null)}
        title={`Deactivate ${deactivating?.registrationNumber || 'vehicle'}?`}
        description="It stops being offered on new challans and transfers. Existing documents keep the vehicle number exactly as it was printed, and you can reactivate it later."
        confirmText="Deactivate"
        variant="destructive"
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
