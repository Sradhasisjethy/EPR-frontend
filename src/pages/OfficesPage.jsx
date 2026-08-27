import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Filter, Building2, MapPin } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { RowActions } from '@/components/data-table/row-actions';
import {
  useOrganizations,
  useOffices,
  useDepartments,
  useDeleteOffice,
} from '@/hooks/use-organization';
import { OfficeFormDialog } from '@/components/organization/office-form-dialog';
import { OrganizationDetailDialog } from '@/components/organization/organization-detail-dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function OfficesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedOrgId = searchParams.get('organizationId') || '';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState(null);

  const { data: orgData } = useOrganizations({ page: 1, limit: 100 });
  const { data: offData, isLoading: offLoading, isError: offError } = useOffices({ page: 1, limit: 100, organizationId: selectedOrgId || undefined });
  const { data: deptData } = useDepartments({ page: 1, limit: 100, organizationId: selectedOrgId || undefined });
  const deleteMutation = useDeleteOffice();

  const handleDeleteClick = (office) => {
    setOfficeToDelete(office);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (officeToDelete) {
      deleteMutation.mutate(officeToDelete.id);
      setOfficeToDelete(null);
    }
  };

  const handleOrgFilter = (orgId) => {
    if (orgId === 'all') {
      searchParams.delete('organizationId');
    } else {
      searchParams.set('organizationId', orgId);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">


      {/* Filter Toolbar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Filter size={13} className="text-primary" />
            <span>Filter by Organization:</span>
          </div>
          <Select
            value={selectedOrgId || 'all'}
            onValueChange={handleOrgFilter}
          >
            <SelectTrigger className="w-[240px] h-9 glass-card bg-background/90 border-border hover:border-primary/50 transition-all rounded-lg font-medium text-xs shadow-xs">
              <div className="flex items-center gap-2 truncate">
                <Building2 size={14} className="text-primary shrink-0" />
                <SelectValue placeholder="All Organizations" />
              </div>
            </SelectTrigger>
            <SelectContent className="glass-card bg-popover/95 backdrop-blur-xl border-border shadow-xl rounded-xl z-50 min-w-[240px]">
              <SelectItem value="all" className="font-medium text-xs py-2.5">
                🏢 All Organizations
              </SelectItem>
              {orgData?.rows?.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs py-2.5 font-medium cursor-pointer">
                  <div className="flex items-center justify-between w-full gap-3">
                    <span>{org.name}</span>
                    {org.code && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold border border-primary/20">
                        {org.code}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Content */}
      {offLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : offError ? (
        <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
          <p>Failed to load offices.</p>
        </div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'name', header: 'Office Name' },
            { 
              id: 'organizationName',
              header: 'Organization', 
              cell: ({ row }) => {
                const name = row.original.Organization?.name || row.original.organization?.name;
                return (
                  <span className="font-semibold text-primary">
                    {name || 'N/A'}
                  </span>
                );
              }
            },
            { accessorKey: 'city', header: 'City', cell: ({ row }) => row.original.city || 'N/A' },
            { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country || 'N/A' },
            { 
              id: 'departmentsList',
              header: 'Departments Operating',
              cell: ({ row }) => {
                const officeId = row.original.id;
                const depts = (deptData?.rows || []).filter(d => d.officeId === officeId || d.Office?.id === officeId);
                return (
                  <div className="flex flex-wrap gap-1">
                    {depts.length > 0 ? (
                      depts.map(d => (
                        <button
                          key={d.id}
                          onClick={() => navigate(`/departments?officeId=${row.original.id}&organizationId=${row.original.organizationId || ''}`)}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all"
                          title="Click to view departments for this office"
                        >
                          📁 {d.name}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">General / All Teams</span>
                    )}
                  </div>
                );
              }
            },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            {
              id: 'actions',
              header: '',
              cell: ({ row }) => (
                <RowActions
                  onView={() => {
                    const officeDepts = (deptData?.rows || []).filter(d => d.officeId === row.original.id || d.Office?.id === row.original.id);
                    setViewingData({ ...row.original, allDepartments: officeDepts });
                    setDetailDialogOpen(true);
                  }}
                  onViewDepartments={() => navigate(`/departments?officeId=${row.original.id}&organizationId=${row.original.organizationId || ''}`)}
                  onEdit={() => { setEditingOffice(row.original); setDialogOpen(true); }}
                  onDelete={() => handleDeleteClick(row.original)}
                />
              ),
            },
          ]}
          data={offData?.rows || []}
          searchKey="name"
          actionsNode={
            <Button onClick={() => { setEditingOffice(null); setDialogOpen(true); }}>
              <Plus size={16} className="mr-1.5" />
              Add Office
            </Button>
          }
        />
      )}

      <OfficeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} office={editingOffice} defaultOrganizationId={selectedOrgId} />
      <OrganizationDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} data={viewingData} type="office" />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Office"
        description={`Delete office "${officeToDelete?.name}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
