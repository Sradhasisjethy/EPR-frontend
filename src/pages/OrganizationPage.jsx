import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { RowActions } from '@/components/data-table/row-actions';
import {
  useOrganizations,
  useDeleteOrganization,
} from '@/hooks/use-organization';
import { OrganizationFormDialog } from '@/components/organization/organization-form-dialog';
import { OrganizationDetailDialog } from '@/components/organization/organization-detail-dialog';

export default function OrganizationPage() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);

  const { data: orgData, isLoading: orgLoading, isError: orgError } = useOrganizations(1, 50);
  const deleteMutation = useDeleteOrganization();

  const handleDelete = (org) => {
    if (window.confirm(`Delete organization "${org.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(org.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-sans">Organizations</h2>
          <p className="text-muted-foreground text-sm">Manage companies and global organization entities</p>
        </div>
        <Button onClick={() => { setEditingOrg(null); setDialogOpen(true); }}>
          <Plus size={16} className="mr-1.5" />
          Add Organization
        </Button>
      </div>

      {/* Main Table */}
      {orgLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : orgError ? (
        <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
          <p>Failed to load organizations.</p>
        </div>
      ) : (
        <DataTable
          columns={[
            { 
              accessorKey: 'name', 
              header: 'Organization Name',
              cell: ({ row }) => (
                <button
                  onClick={() => navigate(`/offices?organizationId=${row.original.id}`)}
                  className="font-semibold text-primary hover:underline text-left text-sm"
                  title="Click to view offices"
                >
                  {row.original.name}
                </button>
              )
            },
            { 
              accessorKey: 'code', 
              header: 'Code', 
              cell: ({ row }) => row.original.code ? (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {row.original.code}
                </span>
              ) : 'N/A' 
            },
            { 
              accessorKey: 'status', 
              header: 'Status', 
              cell: ({ row }) => <StatusBadge status={row.original.status} /> 
            },
            {
              id: 'actions',
              header: '',
              cell: ({ row }) => (
                <RowActions
                  onView={() => { setViewingData(row.original); setDetailDialogOpen(true); }}
                  onViewOffices={() => navigate(`/offices?organizationId=${row.original.id}`)}
                  onEdit={() => { setEditingOrg(row.original); setDialogOpen(true); }}
                  onDelete={() => handleDelete(row.original)}
                />
              ),
            },
          ]}
          data={orgData?.rows || []}
          searchKey="name"
        />
      )}

      <OrganizationFormDialog open={dialogOpen} onOpenChange={setDialogOpen} organization={editingOrg} />
      <OrganizationDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} data={viewingData} type="organization" />
    </div>
  );
}
