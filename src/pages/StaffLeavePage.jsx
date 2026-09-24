import { useEffect, useState } from 'react';
import { MasterImportExportActions } from '@/components/master-data/import-export-actions';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { DateText } from '@/components/date-text';
import { usePaginated } from '@/hooks/use-paginated';
import { useEmployees } from '@/hooks/use-employees';
import {
  useLeaveTypes, useCreateLeaveType, useLeaveRequests, useLeaveBalances, useApplyForLeave, useDecideLeave, useCancelLeave,
} from '@/hooks/use-hr';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { today } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SELECT = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm';
const STATUS_STYLE = {
  PENDING: 'text-amber-600',
  APPROVED: 'text-emerald-600',
  REJECTED: 'text-rose-600',
  CANCELLED: 'text-muted-foreground',
};

const employeeName = (e) => [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email;

function ApplyLeaveDialog({ open, onOpenChange, employees }) {
  const [form, setForm] = useState({ employeeId: '', leaveTypeId: '', fromDate: today(), toDate: today(), halfDay: false, reason: '' });
  const [error, setError] = useState('');
  const { data: types = [] } = useLeaveTypes();
  const apply = useApplyForLeave();

  useEffect(() => {
    if (open) { setForm({ employeeId: '', leaveTypeId: '', fromDate: today(), toDate: today(), halfDay: false, reason: '' }); setError(''); }
  }, [open]);

  const sameDay = form.fromDate === form.toDate;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apply.mutateAsync({
        employeeId: form.employeeId,
        leaveTypeId: form.leaveTypeId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        ...(sameDay && form.halfDay ? { days: 0.5 } : {}),
        reason: form.reason || undefined,
      });
      toast.success('Leave applied for');
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not apply for leave.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>Someone else has to approve it, so it starts as pending.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lv-employee">Employee</Label>
              <select id="lv-employee" className={SELECT} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{employeeName(e)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-type">Leave type</Label>
              <select id="lv-type" className={SELECT} value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required>
                <option value="">Select type</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isPaid ? '' : ' (unpaid)'}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-from">From</Label>
              <Input id="lv-from" type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: e.target.value > form.toDate ? e.target.value : form.toDate })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-to">To</Label>
              <Input id="lv-to" type="date" min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required />
            </div>
          </div>
          {sameDay && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.halfDay} onChange={(e) => setForm({ ...form, halfDay: e.target.checked })} />
              Half day
            </label>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="lv-reason">Reason (optional)</Label>
            <Input id="lv-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={apply.isPending}>{apply.isPending ? 'Applying…' : 'Apply'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeaveTypesCard({ canEdit }) {
  const { data: types = [] } = useLeaveTypes();
  const create = useCreateLeaveType();
  const [form, setForm] = useState({ code: '', name: '', daysPerYear: '', isPaid: true });

  const add = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ code: form.code, name: form.name, daysPerYear: Number(form.daysPerYear || 0), isPaid: form.isPaid });
      toast.success(`${form.name} added`);
      setForm({ code: '', name: '', daysPerYear: '', isPaid: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add the leave type.');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Leave types</h3>
        <div className="flex flex-wrap items-center gap-1">
          <MasterImportExportActions module="leave-types" label="Leave Types" resource="LEAVE" />
        </div>
      </div>
      <ul className="text-sm space-y-1">
        {types.map((t) => (
          <li key={t.id} className="flex justify-between">
            <span>{t.name} <span className="text-xs text-muted-foreground">({t.code}{t.isPaid ? '' : ', unpaid'})</span></span>
            <span className="text-muted-foreground">{t.daysPerYear > 0 ? `${t.daysPerYear} days/yr` : 'no quota'}</span>
          </li>
        ))}
        {types.length === 0 && <li className="text-muted-foreground">None yet — add casual, sick and unpaid leave to start.</li>}
      </ul>
      {canEdit && (
        <form onSubmit={add} className="grid grid-cols-[70px_1fr_80px_auto] gap-2 items-end pt-2 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="lt-code" className="text-xs">Code</Label>
            <Input id="lt-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lt-name" className="text-xs">Name</Label>
            <Input id="lt-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lt-days" className="text-xs">Days/yr</Label>
            <Input id="lt-days" type="number" min="0" step="0.5" value={form.daysPerYear} onChange={(e) => setForm({ ...form, daysPerYear: e.target.value })} />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={create.isPending}>Add</Button>
        </form>
      )}
    </div>
  );
}

function BalancesCard({ employees }) {
  const [employeeId, setEmployeeId] = useState('');
  const { data } = useLeaveBalances(employeeId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Balances</h3>
      <select aria-label="Employee balances" className={SELECT} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
        <option value="">Select an employee</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{employeeName(e)}</option>)}
      </select>
      {data && (
        <>
          <p className="text-xs text-muted-foreground">Leave year {data.leaveYear}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-1 font-medium">Type</th>
                <th className="text-right py-1 font-medium">Allowed</th>
                <th className="text-right py-1 font-medium">Taken</th>
                <th className="text-right py-1 font-medium">Pending</th>
                <th className="text-right py-1 font-medium">Left</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.map((b) => (
                <tr key={b.leaveTypeId} className="border-b border-border/50">
                  <td className="py-1">{b.name}</td>
                  <td className="text-right tabular-nums">{b.allowedDays > 0 ? b.allowedDays : '—'}</td>
                  <td className="text-right tabular-nums">{b.takenDays}</td>
                  <td className="text-right tabular-nums">{b.pendingDays}</td>
                  <td className="text-right tabular-nums font-medium">{b.remainingDays === null ? '—' : b.remainingDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default function StaffLeavePage() {
  const [status, setStatus] = useState('');
  const [applying, setApplying] = useState(false);
  const [rejecting, setRejecting] = useState(null);

  const { data: user } = useCurrentUser();
  const canApply = hasPermission(user, WebPermissions.LEAVE_CREATE);
  const canApprove = hasPermission(user, WebPermissions.LEAVE_APPROVE);
  const canEdit = hasPermission(user, WebPermissions.LEAVE_MODIFY);

  const { data: employeeData } = useEmployees({ page: 1, limit: 200 });
  const employees = employeeData?.rows || [];
  const { query, tableProps } = usePaginated(useLeaveRequests, status ? { status } : {});
  const decide = useDecideLeave();
  const cancel = useCancelLeave();

  const approve = async (row) => {
    try {
      await decide.mutateAsync({ id: row.id, status: 'APPROVED' });
      toast.success('Leave approved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not approve the leave.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LeaveTypesCard canEdit={canEdit} />
        <BalancesCard employees={employees} />
      </div>

      {query.isLoading ? (
        <div className="w-full h-72 rounded-xl border border-border bg-card animate-pulse" />
      ) : (
        <DataTable
          columns={[
            { id: 'employee', header: 'Employee', cell: ({ row }) => employeeName(row.original.employee || {}) },
            { id: 'type', header: 'Type', cell: ({ row }) => row.original.leaveType?.name },
            { id: 'from', header: 'From', cell: ({ row }) => <DateText value={row.original.fromDate} /> },
            { id: 'to', header: 'To', cell: ({ row }) => <DateText value={row.original.toDate} /> },
            { id: 'days', header: 'Days', cell: ({ row }) => row.original.days },
            { accessorKey: 'reason', header: 'Reason' },
            {
              id: 'status', header: 'Status',
              cell: ({ row }) => (
                <span className={cn('text-xs font-medium', STATUS_STYLE[row.original.status])}>
                  {row.original.status.charAt(0) + row.original.status.slice(1).toLowerCase()}
                </span>
              ),
            },
            {
              id: 'actions', header: '',
              cell: ({ row }) => row.original.status === 'PENDING' && (
                <div className="flex justify-end gap-3 text-xs">
                  {canApprove && <button className="text-emerald-600 hover:underline" onClick={() => approve(row.original)}>Approve</button>}
                  {canApprove && <button className="text-destructive hover:underline" onClick={() => setRejecting(row.original)}>Reject</button>}
                  {canEdit && (
                    <button
                      className="text-muted-foreground hover:underline"
                      onClick={async () => {
                        try {
                          await cancel.mutateAsync(row.original.id);
                          toast.success('Request withdrawn');
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Could not withdraw the request.');
                        }
                      }}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          actionsNode={
            <div className="flex items-center gap-2">
              <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">All requests</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {canApply && <Button onClick={() => setApplying(true)}><Plus size={16} /> Apply for leave</Button>}
            </div>
          }
        />
      )}

      <ApplyLeaveDialog open={applying} onOpenChange={setApplying} employees={employees} />

      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        title="Reject leave"
        description="The reason is shown to whoever applied."
        label="Reason"
        placeholder="e.g. Two people are already off that week"
        confirmText="Reject"
        variant="destructive"
        onConfirm={async (note) => {
          try {
            await decide.mutateAsync({ id: rejecting.id, status: 'REJECTED', note });
            toast.success('Leave rejected');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not reject the leave.');
            throw err;
          }
        }}
      />
    </div>
  );
}
