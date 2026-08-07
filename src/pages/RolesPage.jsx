import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { useRoles } from '@/hooks/use-roles';

export default function RolesPage() {
  const { data, isLoading, isError } = useRoles(1, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-muted-foreground">Manage system access roles</p>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
          <p>Failed to load roles.</p>
        </div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'name', header: 'Role Name' },
            { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || 'N/A' },
            { accessorKey: 'permissionsCount', header: 'Permissions', cell: ({ row }) => row.original.permissions?.length || 0 },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
          ]}
          data={data?.rows || []}
          searchKey="name"
        />
      )}
    </div>
  );
}
