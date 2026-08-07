import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { useEmployees } from '@/hooks/use-employees';

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
    cell: ({ row }) => <StatusBadge status={row.original.status} />
  },
  {
    accessorKey: 'dateOfJoining',
    header: 'Date Joined',
    cell: ({ row }) => row.original.dateOfJoining ? formatDate(row.original.dateOfJoining) : 'N/A'
  },
];

export default function EmployeesPage() {
  const { data, isLoading, isError } = useEmployees(1, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage your organization's employees</p>
        </div>
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
    </div>
  );
}
