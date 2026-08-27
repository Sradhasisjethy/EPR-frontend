import { useState } from 'react';
import { Lock } from 'lucide-react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Label } from '@/components/ui/label';
import { QueryState } from '@/components/query-state';
import { useStockReservations } from '@/hooks/use-inventory';
import { useFactories } from '@/hooks/use-factory';

const STATUSES = [
  ['ACTIVE', 'Live holds'],
  ['CONSUMED', 'Consumed by a dispatch'],
  ['RELEASED', 'Released'],
];

/**
 * Stock holds — what is promised to whom, and therefore why the sellable figure
 * is lower than what is on hand.
 *
 * The service behind this has driven sales-order promising since it was
 * written; nothing ever showed the holds themselves.
 */
export default function ReservationsPage() {
  const [factoryFilter, setFactoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const reservationQuery = usePaginated(useStockReservations, {
    factoryId: factoryFilter || undefined,
    status: statusFilter,
  });

  const activeTotal = (reservationQuery.query.data?.rows || [])
    .filter((r) => r.status === 'ACTIVE')
    .reduce((sum, r) => sum + Number(r.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock Reservations</h2>
          <p className="text-sm text-muted-foreground">
            Stock held against confirmed orders. It is on hand, but it cannot be promised to anyone else.
          </p>
        </div>
        {statusFilter === 'ACTIVE' && activeTotal > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock size={15} aria-hidden="true" />
            <span>{activeTotal} units held on this page</span>
          </div>
        )}
      </div>

      <QueryState query={reservationQuery.query} label="reservations">
        <DataTable
          columns={[
            { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || '—' },
            { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || '—' },
            { accessorKey: 'quantity', header: 'Held Qty' },
            {
              id: 'heldFor',
              header: 'Held for',
              // referenceType is almost always SalesOrderLine; showing it plainly
              // beats inventing a label that hides what the hold is attached to.
              cell: ({ row }) => row.original.referenceType?.replace(/([A-Z])/g, ' $1').trim() || '—',
            },
            {
              accessorKey: 'status',
              header: 'Status',
              cell: ({ row }) => (
                <StatusBadge status={row.original.status === 'ACTIVE' ? 'active' : row.original.status} />
              ),
            },
            {
              id: 'released',
              header: 'Released',
              cell: ({ row }) =>
                row.original.releasedAt
                  ? `${String(row.original.releasedAt).slice(0, 10)}${row.original.releasedReason ? ` — ${row.original.releasedReason}` : ''}`
                  : '—',
            },
          ]}
          {...reservationQuery.tableProps}
          searchPlaceholder="Search lot number…"
          emptyMessage={
            statusFilter === 'ACTIVE'
              ? 'Nothing is on hold. Every unit in stock can be promised.'
              : 'No reservations in this state.'
          }
          filtersNode={
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="res-factory" className="text-xs">Location</Label>
                <select
                  id="res-factory"
                  value={factoryFilter}
                  onChange={(e) => setFactoryFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All locations</option>
                  {(factoryData?.rows || []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="res-status" className="text-xs">Status</Label>
                <select
                  id="res-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          }
        />
      </QueryState>
    </div>
  );
}
