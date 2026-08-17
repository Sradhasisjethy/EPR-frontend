import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { usePriceLists, useDeletePriceList } from '@/hooks/use-pricing';
import { PriceListFormDialog } from '@/components/pricing/price-list-form-dialog';

export default function PriceListsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { query, tableProps } = usePaginated(usePriceLists);
  const { isLoading, isError } = query;
  const deletePriceList = useDeletePriceList();

  const handleDelete = (priceList) => {
    if (window.confirm(`Delete price list "${priceList.name}"? This cannot be undone.`)) deletePriceList.mutate(priceList.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Price Lists</h2>
          <p className="text-muted-foreground">Retail, wholesale, party-specific and contractor rates (M05)</p>
        </div>
        <Button onClick={() => { setEditingId(null); setDialogOpen(true); }}>
          <Plus size={16} /> Add Price List
        </Button>
      </div>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load price lists.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'name', header: 'Name' },
            { accessorKey: 'priceType', header: 'Type' },
            { id: 'party', header: 'Party', cell: ({ row }) => row.original.party?.name || 'General' },
            { id: 'default', header: 'Default', cell: ({ row }) => (row.original.isDefault ? 'Yes' : 'No') },
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
                    onClick={() => handleDelete(row.original)}
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
        />
      )}

      <PriceListFormDialog open={dialogOpen} onOpenChange={setDialogOpen} priceListId={editingId} />
    </div>
  );
}
