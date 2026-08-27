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

/** Soonest expiry across insurance, fitness and permit. */
const soonestExpiry = (vehicle) => {
  const entries = [
    ['Insurance', vehicle.insuranceExpiry],
    ['Fitness', vehicle.fitnessExpiry],
    ['Permit', vehicle.permitExpiry],
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
          <h2 className="text-2xl font-bold tracking-tight">Vehicles</h2>
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
            { accessorKey: 'registrationNumber', header: 'Registration' },
            {
              id: 'type',
              header: 'Type',
              cell: ({ row }) => TYPE_LABEL[row.original.vehicleType] || row.original.vehicleType,
            },
            {
              id: 'capacity',
              header: 'Capacity',
              cell: ({ row }) => (row.original.capacityTonnes ? `${Number(row.original.capacityTonnes)} t` : '—'),
            },
            {
              id: 'ownership',
              header: 'Ownership',
              cell: ({ row }) =>
                row.original.ownership === 'HIRED'
                  ? `Hired — ${row.original.transporter?.name || 'transporter'}`
                  : 'Owned',
            },
            {
              id: 'driver',
              header: 'Driver',
              cell: ({ row }) =>
                row.original.driverName
                  ? `${row.original.driverName}${row.original.driverPhone ? ` · ${row.original.driverPhone}` : ''}`
                  : '—',
            },
            {
              id: 'compliance',
              header: 'Papers',
              cell: ({ row }) => {
                const worst = soonestExpiry(row.original);
                if (!worst) return <span className="text-muted-foreground">—</span>;
                if (worst.days < 0) {
                  return (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                      <TriangleAlert size={13} aria-hidden="true" />
                      {worst.label} expired
                    </span>
                  );
                }
                if (worst.days <= 30) {
                  return (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                      <TriangleAlert size={13} aria-hidden="true" />
                      {worst.label} in {worst.days}d
                    </span>
                  );
                }
                return <span className="text-muted-foreground text-xs">OK</span>;
              },
            },
            {
              accessorKey: 'status',
              header: 'Status',
              cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
