import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useRoles, useDeleteRole } from '@/hooks/use-roles';
import { RoleFormDialog } from '@/components/roles/role-form-dialog';

export default function RolesPage() {
  const { data, isLoading, isError } = useRoles(1, 20);
  const deleteMutation = useDeleteRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const handleDelete = (role) => {
    if (window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(role.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-muted-foreground">Manage system access roles</p>
        </div>
        <Button onClick={() => { setEditingRole(null); setDialogOpen(true); }}>
          <Plus size={16} />
          Add Role
        </Button>
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
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            {
              id: 'actions',
              header: '',
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => { setEditingRole(row.original); setDialogOpen(true); }}
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
          data={data?.rows || []}
          searchKey="name"
        />
      )}

      <RoleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} role={editingRole} />
    </div>
  );
}
