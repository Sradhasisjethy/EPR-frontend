import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useParties, useDeleteParty } from '@/hooks/use-parties';
import { PartyFormDialog } from '@/components/parties/party-form-dialog';
import { PartyAddressesDialog } from '@/components/parties/party-addresses-dialog';
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

export default function PartiesPage() {
  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [addressesFor, setAddressesFor] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useParties, { partyType: activeTab || undefined });
  const { isLoading, isError } = query;
  const deleteParty = useDeleteParty();

  const handleDelete = (party) => {
    if (window.confirm(`Delete party "${party.name}"? This cannot be undone.`)) deleteParty.mutate(party.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parties</h2>
          <p className="text-muted-foreground">Customers, vendors, contractors, labour and sales references (M04)</p>
        </div>
        <Button onClick={() => { setEditingParty(null); setDialogOpen(true); }}>
          <Plus size={16} /> Add Party
        </Button>
      </div>

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

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load parties.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'name', header: 'Name' },
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
                  <button
                    onClick={() => { setEditingParty(row.original); setDialogOpen(true); }}
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
          searchPlaceholder="Search party name…"
        />
      )}

      <PartyAddressesDialog open={!!addressesFor} onOpenChange={(v) => !v && setAddressesFor(null)} party={addressesFor} />
      <PartyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} party={editingParty} defaultPartyType={activeTab || PartyType.CUSTOMER} />
    </div>
  );
}
