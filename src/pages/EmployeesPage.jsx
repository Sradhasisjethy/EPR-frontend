import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useEmployees, useDeleteEmployee } from '@/hooks/use-employees';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';

export default function EmployeesPage() {
  const { data, isLoading, isError } = useEmployees(1, 20);
  const deleteMutation = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const handleDelete = (employee) => {
    if (window.confirm(`Delete employee "${employee.firstName} ${employee.lastName}"? This cannot be undone.`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`
    },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'departmentId',
      header: 'Department',
      cell: ({ row }) => row.original.departmentId || 'N/A'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      // employee status comes back uppercase (ACTIVE, ONBOARDING...) — StatusBadge's
      // style map is lowercase, so it needs normalizing here or every badge renders gray.
      cell: ({ row }) => <StatusBadge status={row.original.status?.toLowerCase()} />
    },
    {
      accessorKey: 'dateOfJoining',
      header: 'Date Joined',
      cell: ({ row }) => row.original.dateOfJoining ? formatDate(row.original.dateOfJoining) : 'N/A'
    },
    {
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
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage your organization's employees</p>
        </div>
        <Button onClick={() => { setEditingEmployee(null); setDialogOpen(true); }}>
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
          <p>Failed to load employees.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={data?.rows || []} searchKey="email" />
      )}

      <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editingEmployee} />
    </div>
  );
}
