import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionMatrix } from '@/components/roles/permission-matrix';
import { useCreateRole, useRole, useUpdateRole } from '@/hooks/use-roles';
import { usePermissionCatalog } from '@/hooks/use-permission-catalog';
import { useCurrentUser } from '@/hooks/use-auth';
import { catalogCodes, expandLegacyPermissions, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';

const emptyForm = { name: '', code: '', description: '', permissions: [], status: 'active' };

export default function RoleFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const { data: user } = useCurrentUser();
  const { data: catalog, isLoading: catalogLoading, isError: catalogError } = usePermissionCatalog();
  const { data: role, isLoading: roleLoading, isError: roleError } = useRole(id);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Must be reference-stable: it's a dependency of the seeding effect below, and
  // a fresh `[]` each render would re-seed the form on every keystroke.
  const modules = useMemo(() => catalog?.modules || [], [catalog]);
  const canSave = hasPermission(user, isEditing ? WebPermissions.ROLE_MODIFY : WebPermissions.ROLE_CREATE);

  // Only count codes the catalog actually renders, so a legacy code that survives
  // round-tripping doesn't inflate the total shown next to the save button.
  const knownCodes = useMemo(() => new Set(catalogCodes(modules)), [modules]);
  const selectedCount = form.permissions.filter((code) => knownCodes.has(code)).length;

  // Which role the form has been populated from, so a background refetch can't
  // throw away edits in progress.
  const seededFor = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      // Reset once on entering create mode, not again when the catalog resolves —
      // otherwise anything typed while it was loading gets wiped.
      if (seededFor.current === 'new') return;
      seededFor.current = 'new';
      return setForm(emptyForm);
    }
    // Wait for both: seeding before the catalog lands would leave a legacy role's
    // write boxes unticked, and saving from there would quietly downgrade it.
    if (!role || modules.length === 0 || seededFor.current === role.id) return;

    seededFor.current = role.id;
    setForm({
      name: role.name || '',
      code: role.code || '',
      description: role.description || '',
      permissions: expandLegacyPermissions(role.permissions || [], modules),
      status: role.status || 'active',
    });
  }, [isEditing, role, modules]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Role name is required.');

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim() || undefined,
      permissions: form.permissions,
    };

    const request = isEditing
      ? updateMutation.mutateAsync({ id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    request
      .then(() => navigate('/roles'))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save role.'));
  };

  if (catalogError || (isEditing && roleError)) {
    return (
      <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">
        Failed to load {catalogError ? 'the permission catalog' : 'this role'}.
      </div>
    );
  }

  const isLoading = catalogLoading || (isEditing && roleLoading);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" onClick={() => navigate('/roles')} aria-label="Back to roles">
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Edit Role' : 'Create New Role'}</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {!canSave && !isLoading && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          You don’t have permission to {isEditing ? 'edit' : 'create'} roles — this form is read-only.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter role name"
              disabled={!canSave}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Input
              id="role-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter description"
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-code">Code</Label>
            <Input
              id="role-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Optional short code"
              disabled={!canSave}
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="role-status">Status</Label>
              <select
                id="role-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                disabled={!canSave}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p className="text-xs text-muted-foreground">
                An inactive role grants nothing, whoever is assigned to it.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold">Permissions</h3>
            <span className="text-sm text-muted-foreground tabular-nums">
              {selectedCount} of {knownCodes.size} selected
            </span>
          </div>

          {isLoading ? (
            <div className="h-64 rounded-lg border border-border bg-muted/30 animate-pulse" />
          ) : (
            <PermissionMatrix
              modules={modules}
              grantable={catalog?.grantable}
              value={form.permissions}
              onChange={(permissions) => setForm((prev) => ({ ...prev, permissions }))}
              disabled={!canSave}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/roles')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || isLoading || !canSave}>
          {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </form>
  );
}
