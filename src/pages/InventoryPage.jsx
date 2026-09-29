import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { cn } from '@/lib/utils';
import { useStockByMaterial, useStockLots, useStockLedger, useReleaseLotEarly, useStockAdjustments } from '@/hooks/use-inventory';
import { useFactories } from '@/hooks/use-factory';
import { useTabParam } from '@/hooks/use-tab-param';
import { useUIStore } from '@/store/ui-store';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { trimDecimals } from '@/lib/decimal';
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { DateText } from '@/components/date-text';
import { toast } from 'sonner';

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
  const { glassMode } = useUIStore();
  // Materials leads: "how much cement do we have" is asked far more often
  // than "which batches are these". Lots stays a click away.
  const [activeTab, setActiveTab] = useTabParam(['materials', 'lots', 'ledger', 'adjustments'], 'materials', 'subtab');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [category, setCategory] = useState('');
  const [adjustingLot, setAdjustingLot] = useState(null);
  const [releasingLot, setReleasingLot] = useState(null);
  const [actionError, setActionError] = useState('');

  const { data: user } = useCurrentUser();
  // A physical count correction writes stock with no business document behind
  // it, so it takes INVENTORY_CREATE rather than plain read access.
  const canAdjust = hasPermission(user, 'INVENTORY_CREATE');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const materialsQuery = usePaginated(useStockByMaterial, {
    factoryId: factoryFilter || undefined,
    category: category || undefined,
  });
  const lotsQuery = usePaginated(useStockLots, { factoryId: factoryFilter || undefined }, { sortableColumns: SORTABLE.lots });
  const ledgerQuery = usePaginated(useStockLedger, { factoryId: factoryFilter || undefined }, { sortableColumns: SORTABLE.ledger });
  const adjustmentQuery = usePaginated(useStockAdjustments, { factoryId: factoryFilter || undefined }, { sortableColumns: SORTABLE.adjustments });
  const releaseEarly = useReleaseLotEarly();

  return (
    <div className="space-y-6">
      

      {glassMode ? (
        <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs mb-6">
          {['Materials', 'Lots', 'Ledger', 'Adjustments'].map((tab) => {
            const key = tab.toLowerCase();
            return (
              <button
                key={tab}
                type="button"
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer',
                  activeTab === key
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
                )}
                onClick={() => setActiveTab(key)}
              >
                {tab}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex border-b border-border mb-6">
          {['Materials', 'Lots', 'Ledger', 'Adjustments'].map((tab) => {
            const key = tab.toLowerCase();
            return (
              <button
                key={tab}
                type="button"
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                  activeTab === key ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setActiveTab(key)}
              >
                {tab}
              </button>
            );
          })}
        </div>
      )}

      {actionError && (
        <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{actionError}</div>
      )}

      {activeTab === 'materials' && (
        materialsQuery.query.isLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'productName', header: 'Material' },
              { accessorKey: 'productCode', header: 'Code' },
              {
                id: 'category', header: 'Type',
                cell: ({ row }) => (
                  <span className="text-xs text-muted-foreground">
                    {row.original.isAccessory
                      ? 'Accessory'
                      : row.original.productType === 'RAW_MATERIAL'
                        ? 'Raw material'
                        : 'Finished good'}
                  </span>
                ),
              },
              { accessorKey: 'uom', header: 'Unit' },
              {
                id: 'onHand', header: 'On hand',
                cell: ({ row }) => (
                  <span className={cn('tabular-nums', row.original.belowReorder && 'text-destructive font-semibold')}>
                    {trimDecimals(row.original.onHand)}
                  </span>
                ),
              },
              {
                // The figure a salesperson may actually promise: sellable stock
                // less what is already reserved against an order.
                id: 'available', header: 'Available to promise',
                cell: ({ row }) => <span className="tabular-nums font-medium">{trimDecimals(row.original.available)}</span>,
              },
              {
                // Held stock is broken out rather than folded into on-hand, so
                // "we have 200 but I can only sell 40" has a visible reason.
                id: 'held', header: 'Curing / QC / reserved',
                cell: ({ row }) => {
                  const parts = [
                    row.original.curing > 0 && `${trimDecimals(row.original.curing)} curing`,
                    row.original.awaitingQc > 0 && `${trimDecimals(row.original.awaitingQc)} in QC`,
                    row.original.qcFailed > 0 && `${trimDecimals(row.original.qcFailed)} failed`,
                    row.original.reserved > 0 && `${trimDecimals(row.original.reserved)} reserved`,
                    row.original.inTransit > 0 && `${trimDecimals(row.original.inTransit)} in transit`,
                    row.original.withContractor > 0 && `${trimDecimals(row.original.withContractor)} with contractor`,
                  ].filter(Boolean);
                  return parts.length ? (
                    <span className="text-xs text-muted-foreground">{parts.join(' · ')}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  );
                },
              },
              {
                id: 'reorder', header: 'Reorder at',
                cell: ({ row }) =>
                  row.original.reorderLevel === null || row.original.reorderLevel === 0 ? (
                    <span className="text-xs text-muted-foreground">not set</span>
                  ) : (
                    <span className="tabular-nums text-xs">{trimDecimals(row.original.reorderLevel)}</span>
                  ),
              },
            ]}
            {...materialsQuery.tableProps}
            searchPlaceholder="Search material name or code…"
            emptyMessage="No materials match."
            /* A select on the search row rather than a row of buttons: four
               buttons plus the search box pushed the table halfway down the
               screen, and the filter is not worth that much vertical space. */
            filtersNode={
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-44 px-3 rounded-lg border border-input bg-background text-sm shrink-0"
              >
                <option value="">All types</option>
                <option value="RAW_MATERIAL">Raw material</option>
                <option value="FINISHED_GOOD">Finished goods</option>
                <option value="ACCESSORY">Accessories</option>
              </select>
            }
          />
        )
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
              { id: 'originDate', header: 'Origin Date', cell: ({ row }) => <DateText value={row.original.originDate} /> },
              { accessorKey: 'curingDays', header: 'Curing (d)' },
              { id: 'qty', header: 'Available', cell: ({ row }) => `${trimDecimals(row.original.qtyAvailable)} / ${trimDecimals(row.original.qtyOriginal)}` },
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
                        onClick={() => setReleasingLot(row.original)}
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
              { id: 'when', header: 'When', cell: ({ row }) => <DateText value={row.original.createdAt} withTime /> },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || row.original.lotId },
              { accessorKey: 'movementType', header: 'Movement' },
              {
                id: 'qty', header: 'Qty',
                cell: ({ row }) => (
                  <span className={row.original.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}>
                    {row.original.direction === 'IN' ? '+' : '-'}{trimDecimals(row.original.quantity)}
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
              { id: 'adjustmentDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.adjustmentDate} /> },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || row.original.lotId },
              { id: 'previous', header: 'System Qty', cell: ({ row }) => trimDecimals(row.original.previousQty) },
              { id: 'counted', header: 'Counted', cell: ({ row }) => trimDecimals(row.original.countedQty) },
              {
                id: 'delta', header: 'Difference',
                cell: ({ row }) => {
                  const d = Number(row.original.adjustmentQty);
                  const trimmed = trimDecimals(row.original.adjustmentQty);
                  return <span className={d > 0 ? 'text-emerald-600' : 'text-destructive'}>{d > 0 ? `+${trimmed}` : trimmed}</span>;
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

      <ReasonDialog
        open={!!releasingLot}
        onOpenChange={(v) => !v && setReleasingLot(null)}
        title={`Release Early — ${releasingLot?.lotNumber}`}
        description="Release this lot early, before curing completes? This action is permanently logged against your account (BR-08)."
        label="Reason for early release"
        placeholder="e.g. Urgent customer dispatch, QC testing passed ahead of schedule..."
        confirmText="Release Early"
        variant="default"
        onConfirm={async (reason) => {
          if (!releasingLot) return;
          setActionError('');
          await releaseEarly.mutateAsync({ lotId: releasingLot.id, reason });
          toast.success('Lot released early');
        }}
      />
    </div>
  );
}
