import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2, ShieldAlert, FileText } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useEmployees, useDeleteEmployee } from '@/hooks/use-employees';
import { usePermissions } from '@/hooks/use-permissions';
import { WebPermissions } from '@/constants/enums';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmployeeDocumentsAdminDialog } from '@/components/employees/employee-documents-admin-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const { query, tableProps } = usePaginated(useEmployees);
  const { isLoading, isError, error: fetchError } = query;
  const deleteMutation = useDeleteEmployee();
  const { hasPermission } = usePermissions();
  /**
   * These were one `canWrite = hasPermission('EMPLOYEE_WRITE')`, which nobody
   * ever passed: `_WRITE` is the pre-split legacy code, and the API expands a
   * stored one into EMPLOYEE_CREATE/MODIFY/DELETE rather than keeping it, so
   * the literal string is held by no user. The whole screen was read-only for
   * everyone but the two bypass roles. Split to match what the API checks per
   * route, and taken from the shared constants rather than spelled inline.
   */
  const canCreate = hasPermission(WebPermissions.EMPLOYEE_CREATE);
  const canModify = hasPermission(WebPermissions.EMPLOYEE_MODIFY);
  const canDelete = hasPermission(WebPermissions.EMPLOYEE_DELETE);
  const canAct = canCreate || canModify || canDelete;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [docsDialogFor, setDocsDialogFor] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const handleDelete = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteMutation.mutate(employeeToDelete.id, {
        onSuccess: () => toast.success('Employee deleted'),
        onError: (err) => toast.error(err.response?.data?.message || 'Could not delete the employee.'),
      });
    }
  };

  const columns = [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`,
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 rounded-full border border-border shrink-0">
            {row.original.avatar && <AvatarImage src={row.original.avatar} alt={row.original.firstName} className="object-cover" />}
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {(row.original.firstName?.[0] || 'U').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">
            {`${row.original.firstName || ''} ${row.original.lastName || ''}`.trim() || 'N/A'}
          </span>
        </div>
      )
    },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const assignedRole = row.original.AdGroupMembers?.[0]?.AdGroup?.name;
        const systemRole = row.original.role;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {assignedRole ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {assignedRole}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {systemRole?.replace('_', ' ') || 'EMPLOYEE'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'departmentName',
      header: 'Department',
      cell: ({ row }) => {
        const dept = row.original.Department || row.original.department;
        return (
          <span className="font-medium text-foreground">
            {dept?.name ? `📁 ${dept.name}` : 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status?.toLowerCase()} />
    },
    {
      accessorKey: 'dateOfJoining',
      header: 'Date Joined',
      cell: ({ row }) => row.original.dateOfJoining ? formatDate(row.original.dateOfJoining) : 'N/A'
    },
  ];

  if (canAct) {
    columns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {/* Same grant the API asks for: a colleague's documents are HR's. */}
          {canModify && (
            <button
              onClick={() => setDocsDialogFor(row.original)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="View Documents"
            >
              <FileText size={16} />
            </button>
          )}
          {canModify && (
            <button
              onClick={() => { setEditingEmployee(row.original); setDialogOpen(true); }}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDelete(row.original)}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    });
  }

  const isForbidden = fetchError?.response?.status === 403;

  return (
    <div className="space-y-6">


      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : isError ? (
        <div className="p-10 text-center glass-card rounded-2xl border border-destructive/20 bg-destructive/5 space-y-3">
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-foreground">
            {isForbidden ? 'Access Denied' : 'Failed to load employees'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isForbidden
              ? 'You do not have the required permissions (EMPLOYEE_READ) to view the employee directory. Please contact your system administrator.'
              : 'An unexpected error occurred while fetching employees list.'}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          {...tableProps}
          searchPlaceholder="Search employee…"
          actionsNode={canCreate && (
            <Button onClick={() => { setEditingEmployee(null); setDialogOpen(true); }}>
              <Plus size={16} /> Add Employee
            </Button>
          )}
        />
      )}

      {(canCreate || canModify) && (
        <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editingEmployee} />
      )}
      
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Employee"
        description={`Are you sure you want to delete employee "${employeeToDelete?.firstName || ''} ${employeeToDelete?.lastName || ''}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
      />

      <EmployeeDocumentsAdminDialog 
        open={!!docsDialogFor} 
        onOpenChange={(v) => !v && setDocsDialogFor(null)} 
        employee={docsDialogFor} 
      />
    </div>
  );
}
