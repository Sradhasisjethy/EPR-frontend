import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAttendanceRoster, useMarkAttendance, useAttendanceSummary } from '@/hooks/use-hr';
import { useFactories } from '@/hooks/use-factory';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { today } from '@/lib/date-format';
import { useUIStore } from '@/store/ui-store';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'HALF_DAY', label: 'Half day' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'WEEKLY_OFF', label: 'Weekly off' },
  { value: 'HOLIDAY', label: 'Holiday' },
];

const monthStart = (date) => `${date.slice(0, 7)}-01`;

export default function StaffAttendancePage() {
  const { glassMode } = useUIStore();
  const [date, setDate] = useState(today());
  const [factoryId, setFactoryId] = useState('');
  const [marks, setMarks] = useState({});

  const { data: user } = useCurrentUser();
  const canMark = hasPermission(user, WebPermissions.STAFF_ATTENDANCE_CREATE);
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const factories = factoryData?.rows || [];

  const roster = useAttendanceRoster(date);
  const mark = useMarkAttendance();
  const summary = useAttendanceSummary({ from: monthStart(date), to: date });

  // Start from what is already marked, or from what the leave register implies.
  useEffect(() => {
    if (!roster.data) return;
    setMarks(Object.fromEntries(roster.data.rows.map((r) => [r.employeeId, {
      status: r.suggestedStatus,
      inTime: r.attendance?.inTime || '',
      outTime: r.attendance?.outTime || '',
    }])));
  }, [roster.data]);

  useEffect(() => {
    if (!factoryId && factories.length === 1) setFactoryId(factories[0].id);
  }, [factoryId, factories]);

  const rows = roster.data?.rows || [];
  const counts = useMemo(() => {
    const tally = {};
    for (const row of rows) {
      const status = marks[row.employeeId]?.status;
      if (status) tally[status] = (tally[status] || 0) + 1;
    }
    return tally;
  }, [rows, marks]);

  const save = async () => {
    try {
      const result = await mark.mutateAsync({
        attendanceDate: date,
        ...(factoryId ? { factoryId } : {}),
        entries: rows.map((r) => ({
          employeeId: r.employeeId,
          status: marks[r.employeeId]?.status || 'PRESENT',
          ...(marks[r.employeeId]?.inTime ? { inTime: marks[r.employeeId].inTime } : {}),
          ...(marks[r.employeeId]?.outTime ? { outTime: marks[r.employeeId].outTime } : {}),
        })),
      });
      toast.success(`${result.marked} marked for the day`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save attendance.');
    }
  };

  const setMark = (employeeId, patch) => setMarks((m) => ({ ...m, [employeeId]: { ...m[employeeId], ...patch } }));

  return (
    <div className="space-y-5">
      <div className={cn("flex flex-wrap items-end gap-3 p-4 rounded-2xl border shadow-xs", glassMode ? "glass-card border-white/20 dark:border-white/10" : "bg-card border-border")}>
        <div className="space-y-1.5">
          <Label htmlFor="att-date" className={cn(glassMode && "text-foreground/90 font-medium")}>Date</Label>
          <Input
            id="att-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn("w-44", glassMode && "glass-surface border-white/25 text-foreground")}
          />
        </div>
        <div className="space-y-1.5 w-56">
          <Label htmlFor="att-factory" className={cn(glassMode && "text-foreground/90 font-medium")}>Factory (optional)</Label>
          <select
            id="att-factory"
            className={cn(
              "w-full h-9 px-3 rounded-md border text-sm transition-all",
              glassMode ? "glass-surface border-white/25 text-foreground" : "border-input bg-background"
            )}
            value={factoryId}
            onChange={(e) => setFactoryId(e.target.value)}
          >
            <option value="">Not site-specific</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className={cn("ml-auto flex items-center gap-4 text-sm", glassMode ? "text-foreground/80 font-medium" : "text-muted-foreground")}>
          {STATUSES.filter((s) => counts[s.value]).map((s) => (
            <span key={s.value}>{s.label}: <span className="font-semibold text-foreground">{counts[s.value]}</span></span>
          ))}
        </div>
        {canMark && (
          <Button onClick={save} disabled={mark.isPending || !rows.length}>
            <CalendarCheck size={16} /> {mark.isPending ? 'Saving…' : 'Save attendance'}
          </Button>
        )}
      </div>

      {roster.isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : (
        <div className={cn("rounded-xl border border-border overflow-hidden shadow-xs", glassMode ? "glass-card" : "bg-card")}>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">In</th>
                <th className="text-left px-3 py-2 font-medium">Out</th>
                <th className="text-left px-3 py-2 font-medium">Leave</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const value = marks[row.employeeId] || {};
                const working = ['PRESENT', 'HALF_DAY'].includes(value.status);
                return (
                  <tr key={row.employeeId} className="border-t border-border/50">
                    <td className="px-3 py-1.5">
                      {row.name}
                      {row.employeeCode && <span className="ml-2 text-xs text-muted-foreground">{row.employeeCode}</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        aria-label={`Status for ${row.name}`} disabled={!canMark}
                        className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                        value={value.status || 'PRESENT'} onChange={(e) => setMark(row.employeeId, { status: e.target.value })}
                      >
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        aria-label={`In time for ${row.name}`} type="time" disabled={!canMark || !working} className="h-8 w-28"
                        value={value.inTime || ''} onChange={(e) => setMark(row.employeeId, { inTime: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        aria-label={`Out time for ${row.name}`} type="time" disabled={!canMark || !working} className="h-8 w-28"
                        value={value.outTime || ''} onChange={(e) => setMark(row.employeeId, { outTime: e.target.value })}
                      />
                    </td>
                    <td className={cn('px-3 py-1.5 text-xs', row.approvedLeave ? 'text-amber-600' : 'text-muted-foreground')}>
                      {row.approvedLeave ? `Approved ${row.approvedLeave.name}` : ''}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No staff to mark.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {summary.data && summary.data.rows.length > 0 && (
        <div className={cn("rounded-xl border border-border p-4 shadow-xs", glassMode ? "glass-card" : "bg-card")}>
          <h3 className="text-sm font-semibold mb-2">This month so far</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-1 font-medium">Employee</th>
                <th className="text-right py-1 font-medium">Worked</th>
                <th className="text-right py-1 font-medium">Leave</th>
                <th className="text-right py-1 font-medium">Off</th>
                <th className="text-right py-1 font-medium">Absent</th>
              </tr>
            </thead>
            <tbody>
              {summary.data.rows.map((r) => (
                <tr key={r.employeeId} className="border-b border-border/50">
                  <td className="py-1">{r.name}</td>
                  <td className="text-right tabular-nums">{r.workedDays}</td>
                  <td className="text-right tabular-nums">{r.leaveDays}</td>
                  <td className="text-right tabular-nums">{r.offDays}</td>
                  <td className="text-right tabular-nums">{r.ABSENT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
