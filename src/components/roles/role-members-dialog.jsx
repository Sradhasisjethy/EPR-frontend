import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRoleMembers, useAssignRoleMember, useRemoveRoleMember } from '@/hooks/use-roles';
import { usePermissions } from '@/hooks/use-permissions';
import { WebPermissions } from '@/constants/enums';
import { useEmployees } from '@/hooks/use-employees';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Trash2, Users, ShieldCheck } from 'lucide-react';

export function RoleMembersDialog({ open, onOpenChange, role }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [error, setError] = useState('');

  const { data: members = [], isLoading: membersLoading } = useRoleMembers(role?.id);
  const { data: employeesData } = useEmployees({ limit: 200 }, { enabled: open });
  const allEmployees = employeesData?.rows || employeesData || [];

  const assignMutation = useAssignRoleMember();
  const removeMutation = useRemoveRoleMember();
  /**
   * Membership is a grant, not a detail: putting someone in a role hands them
   * everything the role holds. The API gates these on ROLE_CREATE and
   * ROLE_DELETE and now also refuses to assign a role stronger than the actor's
   * own, so the controls follow the same two grants.
   */
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission(WebPermissions.ROLE_CREATE);
  const canRemove = hasPermission(WebPermissions.ROLE_DELETE);

  const assignedEmployeeIds = new Set(members.map((m) => m.employeeId));
  const availableEmployees = allEmployees.filter((emp) => !assignedEmployeeIds.has(emp.id));

  const handleAssign = async () => {
    if (!selectedEmployeeId || !role) return;
    setError('');
    try {
      await assignMutation.mutateAsync({ roleId: role.id, employeeId: selectedEmployeeId });
      setSelectedEmployeeId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign user to this role.');
    }
  };

  const handleRemove = async (employeeId) => {
    if (!role) return;
    setError('');
    try {
      await removeMutation.mutateAsync({ roleId: role.id, employeeId });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove user from this role.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto w-[95vw] sm:max-w-xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Manage Role Users: {role?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Assign users to this role so they inherit all its {role?.permissions?.length || 0} permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Quick Assign Section */}
        {canAssign && (
        <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary" />
            Assign a User to this Role
          </span>
          <div className="flex gap-2">
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select an employee…</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.email})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={!selectedEmployeeId || assignMutation.isPending}
              className="h-9 px-4 text-xs font-semibold shrink-0"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign User'}
            </Button>
          </div>
        </div>
        )}

        {/* Assigned Members List */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Assigned Users ({members.length})</span>
          </div>

          {membersLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading members…</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs space-y-1">
              <ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1.5" />
              <p className="font-semibold text-foreground">No users assigned yet</p>
              <p className="text-[11px]">Select an employee above to grant them this role's permissions.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {members.map((member) => {
                const emp = member.User;
                const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'Unknown Employee';
                const email = emp?.email || 'N/A';
                const initials = (emp?.firstName?.[0] || 'U').toUpperCase();

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8 rounded-full border border-border shrink-0">
                        {emp?.avatar && <AvatarImage src={emp.avatar} alt={name} className="object-cover" />}
                        <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block truncate">{name}</span>
                        <span className="text-[11px] text-muted-foreground block truncate">{email}</span>
                      </div>
                    </div>

                    {canRemove && (
                      <button
                        onClick={() => handleRemove(member.employeeId)}
                        disabled={removeMutation.isPending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-2"
                        title="Remove user from this role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
