import { useState } from 'react';
import { MasterImportExportActions } from '@/components/master-data/import-export-actions';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Filter, Building2, MapPin } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { RowActions } from '@/components/data-table/row-actions';
import { cn } from '@/lib/utils';
import {
  useOrganizations,
  useOffices,
  useDepartments,
  useDeleteDepartment,
} from '@/hooks/use-organization';
import { DepartmentFormDialog } from '@/components/organization/department-form-dialog';
import { OrganizationDetailDialog } from '@/components/organization/organization-detail-dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useUIStore } from '@/store/ui-store';
import { toast } from 'sonner';

export default function DepartmentsPage() {
  const { glassMode } = useUIStore();
  const { data: user } = useCurrentUser();
  const canCreate = hasPermission(user, WebPermissions.ORG_CREATE);
  const canModify = hasPermission(user, WebPermissions.ORG_MODIFY);
  const canDelete = hasPermission(user, WebPermissions.ORG_DELETE);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedOrgId = searchParams.get('organizationId') || '';
  const selectedOfficeId = searchParams.get('officeId') || '';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const { data: orgData } = useOrganizations({ page: 1, limit: 100 });
  const { data: offData } = useOffices({ page: 1, limit: 100, organizationId: selectedOrgId || undefined });
  const { data: deptData, isLoading: deptLoading, isError: deptError } = useDepartments({
    page: 1,
    limit: 100,
    organizationId: selectedOrgId || undefined,
    officeId: selectedOfficeId || undefined,
  });
  const deleteMutation = useDeleteDepartment();

  const handleDeleteClick = (dept) => {
    setDepartmentToDelete(dept);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (departmentToDelete) {
      deleteMutation.mutate(departmentToDelete.id, {
        onSuccess: () => toast.success('Department deleted'),
        onError: (err) => toast.error(err.response?.data?.message || 'Could not delete the department.'),
      });
      setDepartmentToDelete(null);
    }
  };

  const handleOrgFilter = (orgId) => {
    if (orgId === 'all') {
      searchParams.delete('organizationId');
      searchParams.delete('officeId');
    } else {
      searchParams.set('organizationId', orgId);
      searchParams.delete('officeId');
    }
    setSearchParams(searchParams);
  };

  const handleOfficeFilter = (offId) => {
    if (offId === 'all') {
      searchParams.delete('officeId');
    } else {
      searchParams.set('officeId', offId);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">


      {/* Filter Toolbar */}
      <div className={cn("flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl", glassMode ? "glass-card shadow-xs" : "")}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Org Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter size={13} className="text-primary" />
              <span>Organization:</span>
            </div>
            <Select
              value={selectedOrgId || 'all'}
              onValueChange={handleOrgFilter}
            >
              <SelectTrigger className="w-[210px] h-9 glass-card bg-background/90 border-border hover:border-primary/50 transition-all rounded-lg font-medium text-xs shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <Building2 size={14} className="text-primary shrink-0" />
                  <SelectValue placeholder="All Organizations" />
                </div>
              </SelectTrigger>
              <SelectContent className="glass-card bg-popover/95 backdrop-blur-xl border-border shadow-xl rounded-xl z-50 min-w-[210px]">
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

          {/* Office Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <MapPin size={13} className="text-primary" />
              <span>Office Location:</span>
            </div>
            <Select
              value={selectedOfficeId || 'all'}
              onValueChange={handleOfficeFilter}
            >
              <SelectTrigger className="w-[210px] h-9 glass-card bg-background/90 border-border hover:border-primary/50 transition-all rounded-lg font-medium text-xs shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <MapPin size={14} className="text-primary shrink-0" />
                  <SelectValue placeholder="All Offices" />
                </div>
              </SelectTrigger>
              <SelectContent className="glass-card bg-popover/95 backdrop-blur-xl border-border shadow-xl rounded-xl z-50 min-w-[210px]">
                <SelectItem value="all" className="font-medium text-xs py-2.5">
                  📍 All Offices
                </SelectItem>
                {offData?.rows?.map((off) => (
                  <SelectItem key={off.id} value={off.id} className="text-xs py-2.5 font-medium cursor-pointer">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{off.name}</span>
                      <span className="text-[10px] text-muted-foreground">({off.city || 'HQ'})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {deptLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : deptError ? (
        <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
          <p>Failed to load departments.</p>
        </div>
      ) : (
        <DataTable
          columns={[
            { 
              accessorKey: 'name', 
              header: 'Department Name',
              cell: ({ row }) => {
                const dept = row.original;
                const isSubDept = !!dept.parentId || !!dept.parentDepartment;
                const subCount = dept.subDepartments?.length || 0;
                return (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium text-foreground", isSubDept && "pl-4 text-sm text-foreground/90")}>
                        {isSubDept ? '└─ ' : '📁 '} {dept.name}
                      </span>
                      {subCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {subCount} Sub-dept{subCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {isSubDept && dept.parentDepartment && (
                      <span className="pl-8 text-xs text-muted-foreground">
                        Parent: {dept.parentDepartment.name}
                      </span>
                    )}
                  </div>
                );
              }
            },
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
            { 
              id: 'officeLocation',
              header: 'Assigned Offices',
              cell: ({ row }) => {
                const offices = (row.original.offices && row.original.offices.length > 0)
                  ? row.original.offices
                  : row.original.Office ? [row.original.Office] : [];
                return (
                  <div className="flex flex-wrap gap-1">
                    {offices.length > 0 ? (
                      offices.map((off) => (
                        <button
                          key={off.id}
                          onClick={() => navigate(`/offices?organizationId=${row.original.organizationId || ''}`)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all text-left"
                          title="Click to view offices"
                        >
                          📍 {off.name}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">All / Flexible Locations</span>
                    )}
                  </div>
                );
              }
            },
            { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
            { 
              id: 'hierarchyType',
              header: 'Level',
              cell: ({ row }) => {
                const isSubDept = !!row.original.parentId || !!row.original.parentDepartment;
                return (
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                    isSubDept ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  )}>
                    {isSubDept ? 'Sub-Department' : 'Main Department'}
                  </span>
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
                    setViewingData(row.original);
                    setDetailDialogOpen(true);
                  }}
                  onViewOffices={() => navigate(`/offices?organizationId=${row.original.organizationId || ''}`)}
                  onEdit={canModify ? () => { setEditingDept(row.original); setDialogOpen(true); } : undefined}
                  onDelete={canDelete ? () => handleDeleteClick(row.original) : undefined}
                />
              ),
            },
          ]}
          data={deptData?.rows || []}
          searchKey="name"
          actionsNode={
            <>
              {canCreate && (
                <Button onClick={() => { setEditingDept(null); setDialogOpen(true); }}>
                  <Plus size={16} className="mr-1.5" />
                  Add Department
                </Button>
              )}
              <MasterImportExportActions
                module="departments"
                label="Departments"
                resource="ORG"
                filters={{ ...(selectedOrgId ? { organizationId: selectedOrgId } : {}) }}
              />
            </>
          }
        />
      )}

      <DepartmentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} department={editingDept} defaultOrganizationId={selectedOrgId} />
      <OrganizationDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} data={viewingData} type="department" />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Department"
        description={`Delete department "${departmentToDelete?.name}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
