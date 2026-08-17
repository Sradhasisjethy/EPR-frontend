import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
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
import { OfficeFormDialog } from '@/components/organization/office-form-dialog';
import { DepartmentFormDialog } from '@/components/organization/department-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useTabParam(['organizations', 'offices', 'departments'], 'organizations');

  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);

  const orgs = usePaginated(useOrganizations);
  const offices = usePaginated(useOffices);
  const depts = usePaginated(useDepartments);
  const { isLoading: orgLoading, isError: orgError } = orgs.query;
  const { isLoading: offLoading, isError: offError } = offices.query;
  const { isLoading: deptLoading, isError: deptError } = depts.query;

  const deleteOrg = useDeleteOrganization();
  const deleteOffice = useDeleteOffice();
  const deleteDept = useDeleteDepartment();

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

      <div className="flex border-b border-border mb-6">
        {['Organizations', 'Offices', 'Departments'].map(tab => (
          <button
            key={tab}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.toLowerCase() ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab.toLowerCase())}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'organizations' && (
        <>
          {orgLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : orgError ? (
            <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
              <p>Failed to load organizations.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'name', header: 'Name' },
                { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                {
                  id: 'actions',
                  header: '',
                  cell: ({ row }) => (
                    <RowActions
                      onEdit={() => { setEditingOrg(row.original); setOrgDialogOpen(true); }}
                      onDelete={() => handleDeleteOrg(row.original)}
                    />
                  ),
                },
              ]}
              {...orgs.tableProps}
              searchPlaceholder="Search by name…"
            />
          )}
        </>
      )}

      {activeTab === 'offices' && (
        <>
          {offLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : offError ? (
            <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
              <p>Failed to load offices.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'name', header: 'Name' },
                { accessorKey: 'city', header: 'City', cell: ({ row }) => row.original.city || 'N/A' },
                { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country || 'N/A' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                {
                  id: 'actions',
                  header: '',
                  cell: ({ row }) => (
                    <RowActions
                      onEdit={() => { setEditingOffice(row.original); setOfficeDialogOpen(true); }}
                      onDelete={() => handleDeleteOffice(row.original)}
                    />
                  ),
                },
              ]}
              {...offices.tableProps}
              searchPlaceholder="Search by name…"
            />
          )}
        </>
      )}

      {activeTab === 'departments' && (
        <>
          {deptLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : deptError ? (
            <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
              <p>Failed to load departments.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'name', header: 'Name' },
                { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                {
                  id: 'actions',
                  header: '',
                  cell: ({ row }) => (
                    <RowActions
                      onEdit={() => { setEditingDept(row.original); setDeptDialogOpen(true); }}
                      onDelete={() => handleDeleteDept(row.original)}
                    />
                  ),
                },
              ]}
              {...depts.tableProps}
              searchPlaceholder="Search by name…"
            />
          )}
        </>
      )}

      <OrganizationFormDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} organization={editingOrg} />
      <OfficeFormDialog open={officeDialogOpen} onOpenChange={setOfficeDialogOpen} office={editingOffice} />
      <DepartmentFormDialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen} department={editingDept} />
    </div>
  );
}
