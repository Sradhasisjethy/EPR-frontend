import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { cn } from '@/lib/utils';
import { useStockLots, useStockLedger, useReleaseLotEarly, useStockAdjustments } from '@/hooks/use-inventory';
import { useFactories } from '@/hooks/use-factory';
import { useTabParam } from '@/hooks/use-tab-param';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment-dialog';

// Must match the allow-lists StockLedgerService passes to `toOrder`.
const SORTABLE = {
  lots: ['lotNumber', 'originDate', 'status', 'qtyAvailable'],
  ledger: ['movementType', 'quantity', 'createdAt'],
  adjustments: ['adjustmentNumber', 'adjustmentDate', 'adjustmentQty'],
};

const LOT_STATUS_STYLES = {
  CURING: 'bg-amber-500/10 text-amber-600',
  AVAILABLE: 'bg-emerald-500/10 text-emerald-600',
  WITH_CONTRACTOR: 'bg-blue-500/10 text-blue-600',
  IN_TRANSIT: 'bg-violet-500/10 text-violet-600',
  CONSUMED: 'bg-slate-500/10 text-slate-600',
};

function LotStatusBadge({ status }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', LOT_STATUS_STYLES[status] || '')}>
      {status}
    </span>
  );
}

// AC-13.1's dashboard colours: green fresh, yellow slow-moving, red dead.
const AGEING_STYLES = {
  FRESH: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  SLOW_MOVING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DEAD: 'bg-destructive/10 text-destructive',
};

function AgeingBadge({ ageingClass, ageDays }) {
  // Curing lots are deliberately never classified (AC-13.2), so an unset class
  // is expected here rather than missing data.
  if (!ageingClass) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', AGEING_STYLES[ageingClass])}>
      {ageingClass.replace('_', ' ')}
      {typeof ageDays === 'number' && <span className="ml-1 opacity-70">{ageDays}d</span>}
    </span>
  );
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useTabParam(['lots', 'ledger', 'adjustments'], 'lots', 'subtab');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [adjustingLot, setAdjustingLot] = useState(null);
  const [actionError, setActionError] = useState('');

  const { data: user } = useCurrentUser();
  // A physical count correction writes stock with no business document behind
  // it, so it takes INVENTORY_CREATE rather than plain read access.
  const canAdjust = hasPermission(user, 'INVENTORY_CREATE');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const lotsQuery = usePaginated(useStockLots, { factoryId: factoryFilter || undefined }, { sortableColumns: SORTABLE.lots });
  const ledgerQuery = usePaginated(useStockLedger, { factoryId: factoryFilter || undefined }, { sortableColumns: SORTABLE.ledger });
  const adjustmentQuery = usePaginated(useStockAdjustments, { factoryId: factoryFilter || undefined }, { sortableColumns: SORTABLE.adjustments });
  const releaseEarly = useReleaseLotEarly();

  return (
    <div className="space-y-6">
      

      <div className="flex border-b border-border mb-6">
        {['Lots', 'Ledger', 'Adjustments'].map((tab) => {
          const key = tab.toLowerCase();
          return (
            <button
              key={tab}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab(key)}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{actionError}</div>
      )}

      {activeTab === 'lots' && (
        lotsQuery.query.isLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'lotNumber', header: 'Lot #' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              { accessorKey: 'originType', header: 'Origin' },
              { accessorKey: 'originDate', header: 'Origin Date' },
              { accessorKey: 'curingDays', header: 'Curing (d)' },
              { id: 'qty', header: 'Available', cell: ({ row }) => `${row.original.qtyAvailable} / ${row.original.qtyOriginal}` },
              { id: 'status', header: 'Status', cell: ({ row }) => <LotStatusBadge status={row.original.status} /> },
              {
                id: 'ageing', header: 'Ageing',
                cell: ({ row }) => <AgeingBadge ageingClass={row.original.ageingClass} ageDays={row.original.ageDays} />,
              },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex items-center justify-end gap-3">
                    {row.original.status === 'CURING' && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => {
                          // BR-08 / AC-4.4: a reason is mandatory and is stored
                          // permanently on the lot, so prompt rather than confirm.
                          const reason = window.prompt(
                            'Release this lot early, before curing completes?\nThis is logged against your name (BR-08).\n\nReason:'
                          );
                          if (reason && reason.trim()) {
                            setActionError('');
                            releaseEarly.mutate(
                              { lotId: row.original.id, reason },
                              { onError: (err) => setActionError(err.response?.data?.message || 'Could not release this lot.') }
                            );
                          }
                        }}
                      >
                        Release early
                      </button>
                    )}
                    {row.original.releasedEarlyAt && (
                      <span
                        className="text-xs text-amber-600 dark:text-amber-400"
                        title={`Released early: ${row.original.releasedEarlyReason || ''}`}
                      >
                        Early-released
                      </span>
                    )}
                    {canAdjust && Number(row.original.qtyAvailable) !== 0 && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                        title="Record a physical count against this lot"
                        onClick={() => setAdjustingLot(row.original)}
                      >
                        Adjust
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            {...lotsQuery.tableProps}
            emptyMessage="No stock lots here yet. Receiving goods or producing them is what creates one."
          actionsNode={
            <select
          value={factoryFilter}
          onChange={(e) => setFactoryFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Factories</option>
          {(factoryData?.rows || []).map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
          }
            searchPlaceholder="Search lot number…"
          />
        )
      )}

      {activeTab === 'ledger' && (
        ledgerQuery.query.isLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              { id: 'when', header: 'When', cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || row.original.lotId },
              { accessorKey: 'movementType', header: 'Movement' },
              {
                id: 'qty', header: 'Qty',
                cell: ({ row }) => (
                  <span className={row.original.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}>
                    {row.original.direction === 'IN' ? '+' : '-'}{row.original.quantity}
                  </span>
                ),
              },
              { accessorKey: 'referenceType', header: 'Reference' },
              {
                id: 'flag', header: '',
                cell: ({ row }) => (row.original.isNegativeStockEvent ? <span className="text-xs text-red-600">Negative stock</span> : null),
              },
            ]}
            {...ledgerQuery.tableProps}
            emptyMessage="No stock movements recorded yet."
          actionsNode={
            <select
          value={factoryFilter}
          onChange={(e) => setFactoryFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Factories</option>
          {(factoryData?.rows || []).map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
          }
            searchPlaceholder="Search lot number…"
          />
        )
      )}

      {activeTab === 'adjustments' && (
        adjustmentQuery.query.isLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'adjustmentNumber', header: 'Adjustment #' },
              { accessorKey: 'adjustmentDate', header: 'Date' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || row.original.lotId },
              { id: 'previous', header: 'System Qty', cell: ({ row }) => Number(row.original.previousQty) },
              { id: 'counted', header: 'Counted', cell: ({ row }) => Number(row.original.countedQty) },
              {
                id: 'delta', header: 'Difference',
                cell: ({ row }) => {
                  const d = Number(row.original.adjustmentQty);
                  return <span className={d > 0 ? 'text-emerald-600' : 'text-destructive'}>{d > 0 ? `+${d}` : d}</span>;
                },
              },
              { accessorKey: 'reason', header: 'Reason' },
            ]}
            {...adjustmentQuery.tableProps}
            showSearch={false}
            emptyMessage="No stock adjustments recorded. Use Adjust on a lot to record a physical count."
          actionsNode={
            <select
          value={factoryFilter}
          onChange={(e) => setFactoryFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Factories</option>
          {(factoryData?.rows || []).map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
          }
          />
        )
      )}

      <StockAdjustmentDialog open={!!adjustingLot} onOpenChange={(v) => !v && setAdjustingLot(null)} lot={adjustingLot} />
    </div>
  );
}
