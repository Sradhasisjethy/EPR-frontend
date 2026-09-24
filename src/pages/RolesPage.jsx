import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useRoles, useDeleteRole } from '@/hooks/use-roles';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { RoleMembersDialog } from '@/components/roles/role-members-dialog';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { WebPermissions } from '@/constants/enums';

export default function RolesPage() {
  const navigate = useNavigate();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [membersRole, setMembersRole] = useState(null);

  // Role administration is the most privileged screen in the app, and until now
  // every control on it rendered for anyone who could reach the page. The API
  // refuses these calls, but the buttons should not be offered in the first
  // place. Managing membership is a grant in its own right: adding someone to a
  // role hands them that role's permissions.
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(WebPermissions.ROLE_CREATE);
  const canModify = hasPermission(WebPermissions.ROLE_MODIFY);
  const canDelete = hasPermission(WebPermissions.ROLE_DELETE);

  const { query, tableProps } = usePaginated(useRoles);
  const { isLoading, isError } = query;
  const deleteMutation = useDeleteRole();

  const handleDeleteClick = (role) => {
    setRoleToDelete(role);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (roleToDelete) {
      deleteMutation.mutate(roleToDelete.id, {
        onSuccess: () => toast.success('Role deleted'),
        onError: (err) => toast.error(err.response?.data?.message || 'Could not delete the role.'),
      });
      setRoleToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
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
                    onClick={() => setMembersRole(row.original)}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Manage Users in this Role"
                  >
                    <Users size={16} />
                  </button>
                  {canModify && (
                    <button
                      onClick={() => navigate(`/roles/${row.original.id}`)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteClick(row.original)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search role…"
          actionsNode={
            canCreate && (
              <Button onClick={() => navigate('/roles/new')}>
                <Plus size={16} />
                Add Role
              </Button>
            )
          }
        />
      )}

      <RoleMembersDialog
        open={!!membersRole}
        onOpenChange={(v) => !v && setMembersRole(null)}
        role={membersRole}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Role"
        description={`Delete role "${roleToDelete?.name}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
