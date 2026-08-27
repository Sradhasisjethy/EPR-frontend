import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useParties, useDeleteParty } from '@/hooks/use-parties';
import { PartyFormDialog } from '@/components/parties/party-form-dialog';
import { PartyAddressesDialog } from '@/components/parties/party-addresses-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PartyType } from '@/constants/enums';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = [
  { key: '', label: 'All' },
  { key: PartyType.CUSTOMER, label: 'Customers' },
  { key: PartyType.VENDOR, label: 'Vendors' },
  { key: PartyType.CONTRACTOR, label: 'Contractors' },
  { key: PartyType.LABOUR, label: 'Labour' },
  { key: PartyType.SALES_REF, label: 'Sales Reference' },
];

const TAB_KEYS = TABS.map((tab) => tab.key);

// Must match the allow-list PartiesService.listParties passes to `toOrder`.
// A column the API won't order by is left unsortable rather than rendering a
// control that silently reorders one page.
const SORTABLE_COLUMNS = ['name', 'partyType', 'status'];

export default function PartiesPage() {
  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, '', 'subtab');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [addressesFor, setAddressesFor] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const canCreate = hasPermission(user, 'PARTY_CREATE');
  const canModify = hasPermission(user, 'PARTY_MODIFY');
  const canDelete = hasPermission(user, 'PARTY_DELETE');

  const { query, tableProps } = usePaginated(
    useParties,
    { partyType: activeTab || undefined },
    { sortableColumns: SORTABLE_COLUMNS }
  );
  const { isLoading, isError } = query;
  const deleteParty = useDeleteParty();
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteClick = (party) => {
    setPartyToDelete(party);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (partyToDelete) {
      setDeleteError('');
      deleteParty.mutate(partyToDelete.id, {
        onError: (err) => setDeleteError(err.response?.data?.message || 'Failed to delete party.'),
      });
      setPartyToDelete(null);
    }
  };

  return (
    <div className="space-y-6">

      

      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {deleteError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{deleteError}</div>
      )}

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load parties.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'name', header: 'Name' },
            { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || '—' },
            { accessorKey: 'partyType', header: 'Type' },
            { id: 'contact', header: 'Contact', cell: ({ row }) => row.original.phone || row.original.email || 'N/A' },
            { id: 'location', header: 'Location', cell: ({ row }) => [row.original.city, row.original.state].filter(Boolean).join(', ') || 'N/A' },
            ...(showRates
              ? [{
                  id: 'credit', header: 'Credit / Wage',
                  cell: ({ row }) =>
                    row.original.partyType === PartyType.LABOUR
                      ? formatINR(row.original.wageProfile?.dailyWagePaise)
                      : row.original.partyType === PartyType.CUSTOMER
                        ? formatINR(row.original.creditLimitPaise)
                        : 'N/A',
                }]
              : []),
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setAddressesFor(row.original)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Addresses (shipping address drives GST place of supply)"
                  >
                    <MapPin size={16} />
                  </button>
                  {canModify && (
                    <button
                      onClick={() => { setEditingParty(row.original); setDialogOpen(true); }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteClick(row.original)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search name, code, GSTIN or phone…"
          actionsNode={canCreate && (
          <Button onClick={() => { setEditingParty(null); setDialogOpen(true); }}>
            <Plus size={16} /> Add Party
          </Button>
        )}
          emptyMessage="No parties yet. Add a customer, vendor, contractor or labourer to get started."
        />
      )}

      <PartyAddressesDialog open={!!addressesFor} onOpenChange={(v) => !v && setAddressesFor(null)} party={addressesFor} />
      <PartyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} party={editingParty} defaultPartyType={activeTab || PartyType.CUSTOMER} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Party"
        description={`Delete party "${partyToDelete?.name}"? Only a party with no orders, invoices, payments or ledger entries can be deleted. To retire one that has history, edit it and set its status to Inactive instead.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
