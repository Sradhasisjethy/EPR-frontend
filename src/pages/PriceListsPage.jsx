import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { usePriceLists, useDeletePriceList } from '@/hooks/use-pricing';
import { PriceListFormDialog } from '@/components/pricing/price-list-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function PriceListsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState(null);

  const { query, tableProps } = usePaginated(usePriceLists);
  const { isLoading, isError } = query;
  const deletePriceList = useDeletePriceList();

  const handleDeleteClick = (priceList) => {
    setPriceListToDelete(priceList);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (priceListToDelete) {
      deletePriceList.mutate(priceListToDelete.id);
      setPriceListToDelete(null);
    }
  };

  return (
    <div className="space-y-6">

      

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load price lists.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'name', header: 'Price List Name' },
            {
              id: 'scope',
              header: 'Applicable Scope',
              cell: ({ row }) => {
                if (row.original.party) {
                  return (
                    <div className="space-y-0.5">
                      <span className="font-semibold text-primary block">{row.original.party.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{row.original.party.partyType} Specific</span>
                    </div>
                  );
                }
                if (row.original.customerTier) {
                  return (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted/80 border border-border">
                      {row.original.customerTier} Tier
                    </span>
                  );
                }
                return <span className="text-xs text-muted-foreground">General (All Customers)</span>;
              },
            },
            {
              id: 'rateBasis',
              header: 'Rate Basis',
              cell: ({ row }) => (
                <span className="text-xs font-medium">
                  {row.original.rateBasis === 'TAX_INCLUSIVE' ? 'MRP / Tax Incl.' : 'Tax Exclusive'}
                </span>
              ),
            },
            {
              id: 'validity',
              header: 'Validity Period',
              cell: ({ row }) => {
                const from = row.original.effectiveFrom;
                const to = row.original.validUntil;
                if (!from && !to) return <span className="text-xs text-muted-foreground">Always Active</span>;
                return (
                  <span className="text-xs font-mono">
                    {from || 'Start'} &rarr; {to || 'Open'}
                  </span>
                );
              },
            },
            {
              id: 'default',
              header: 'Default',
              cell: ({ row }) =>
                row.original.isDefault ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Default
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                ),
            },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => { setEditingId(row.original.id); setDialogOpen(true); }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(row.original)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search price list…"
          actionsNode={
            <Button onClick={() => { setEditingId(null); setDialogOpen(true); }}>
          <Plus size={16} /> Add Price List
        </Button>
          }
        />
      )}

      <PriceListFormDialog open={dialogOpen} onOpenChange={setDialogOpen} priceListId={editingId} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Price List"
        description={`Delete price list "${priceListToDelete?.name}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
