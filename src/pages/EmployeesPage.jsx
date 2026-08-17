import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useEmployees, useDeleteEmployee } from '@/hooks/use-employees';
import { usePermissions } from '@/hooks/use-permissions';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';

export default function EmployeesPage() {
  const { data, isLoading, isError, error: fetchError } = useEmployees(1, 100);
  const deleteMutation = useDeleteEmployee();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('EMPLOYEE_WRITE');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const handleDelete = (employee) => {
    if (window.confirm(`Delete employee "${employee.firstName} ${employee.lastName}"? This cannot be undone.`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const columns = [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`,
      header: 'Name',
      cell: ({ row }) => `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim() || 'N/A'
    },
    { accessorKey: 'email', header: 'Email' },
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

  if (canWrite) {
    columns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => { setEditingEmployee(row.original); setDialogOpen(true); }}
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
    });
  }

  const isForbidden = fetchError?.response?.status === 403;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage your organization's employees</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditingEmployee(null); setDialogOpen(true); }}>
            <Plus size={16} />
            Add Employee
          </Button>
        )}
      </div>

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
        <DataTable columns={columns} data={data?.rows || []} searchKey="email" />
      )}

      {canWrite && (
        <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editingEmployee} />
      )}
    </div>
  );
}
